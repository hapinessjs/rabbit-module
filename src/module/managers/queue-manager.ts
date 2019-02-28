import * as _pick from 'lodash.pick';
import { Observable } from 'rxjs';
import { Channel as ChannelInterface, Replies, Options } from 'amqplib';
import { extractMetadataByDecorator, errorHandler } from '@hapiness/core';
import { sendMessage, decodeJSONContent } from '../message';
import { MessageResult, MessageOptions, RabbitMessage, ConsumeOptions, QueueInterface, Bind, QueueDispatcherOptions } from '../interfaces';
import { ExchangeDecoratorInterface, ChannelManager } from '..';
import { QueueWrapper } from './queue-wrapper';
import { events } from '../events';
import { MessageStore, StoreMessage } from './message-store';

const debug = require('debug')('hapiness:rabbitmq');
export const QUEUE_OPTIONS = ['durable', 'exclusive', 'autoDelete', 'arguments'];

export class QueueManager {
    private _ch: ChannelManager;
    private _name: string;
    private _queue: QueueInterface;
    private _queueWrapper: QueueWrapper;
    private _binds: Array<Bind>;
    private _forceJsonDecode: boolean;
    private _isAsserted: boolean;
    private _consuming = false;
    private _consumerTag: string;
    private _dispatcher: (ch: ChannelInterface, message: RabbitMessage, { queue }: QueueDispatcherOptions) =>
    Observable<() => Observable<MessageResult>>;
    private _options: Options.AssertQueue;

    constructor(ch: ChannelManager, queue: QueueWrapper) {
        this._ch = ch;

        if (queue instanceof QueueWrapper) {
            this._queue = queue.getInstance();
            this._name = queue.getName();
            this._binds = queue.getBinds();
            this._options = _pick(queue.getAssertOptions(), QUEUE_OPTIONS);
            this._forceJsonDecode = queue.getForceJsonDecode();
            this._queueWrapper = queue;
        } else {
            throw new Error('Invalid queue parameter');
        }

        this._isAsserted = false;
    }

    getName(): string {
        return this._name;
    }

    getQueue(): QueueInterface {
        return this._queue;
    }

    getOptions(): Options.AssertQueue {
        return this._options;
    }

    getWrapper() {
        return this._queueWrapper;
    }

    assert(): Observable<QueueManager> {
        debug(`asserting queue ${this.getName()}...`);
        return Observable.fromPromise(this._ch.getChannel().assertQueue(this.getName(), this._options)).map(_ => {
            this._isAsserted = true;
            debug(`... queue ${this.getName()} asserted`);

            if (this._queue && typeof this._queue['onAsserted'] === 'function') {
                debug('fire onAsserted method');
                this._queue['onAsserted']();
            }

            return this;
        });
    }

    isAsserted(): boolean {
        return this._isAsserted;
    }

    setDispatcher(_dispatcher: (ch: ChannelInterface, message: RabbitMessage, { queue }: QueueDispatcherOptions) =>
    Observable<() => Observable<MessageResult>>) {
        if (typeof _dispatcher !== 'function') {
            throw new Error(`dispatcher should be a function and not a ${typeof _dispatcher}`);
        }

        this._dispatcher = _dispatcher;
    }

    getDispatcher() {
        return this._dispatcher;
    }

    consume(
        options: ConsumeOptions = { decodeMessageContent: true, errorHandler: null, force_json_decode: false }
    ): Observable<Replies.Consume> {
        debug(`consuming queue ${this.getName()}...`);
        if (typeof options.decodeMessageContent !== 'boolean') {
            options.decodeMessageContent = true;
        }

        const dispatcher = this.getDispatcher();

        // Reconsume queue when channel is reconnected
        this._ch.on('reconnected', () => {
            this._consume({ dispatcher, options });
        });
        return this._consume({ dispatcher, options });
    }

    private _consume({
        dispatcher,
        options
    }): Observable<Replies.Consume> {
        if (this._consuming) {
            return Observable.of(null);
        }

        let _dispatcher = dispatcher;

        let defaultDispatch: (message: RabbitMessage, ch, { queue }: QueueDispatcherOptions) => Observable<MessageResult>;

        // If the @Queue does not ship an onMessage method we create a fallback
        // that will ack the message
        if (typeof this._queue['onMessage'] !== 'function') {
            defaultDispatch = (message: RabbitMessage, ch, { queue }: QueueDispatcherOptions): Observable<MessageResult>  => {
                // message not dispatched
                debug('message not dispatched', message);
                events.queueManager.emit('message_not_dispatched', message, ch);
                return Observable.of({ ack: true });
            };
        } else {
            // Otherwise the fallback of the dispatcher will be the queue onMessage function
            defaultDispatch = this._queue['onMessage'].bind(this._queue);
        }

        if (typeof dispatcher !== 'function') {
            _dispatcher = (ch: ChannelInterface, message: RabbitMessage) =>
                Observable.of(() => defaultDispatch(message, ch, { queue: this._queueWrapper }));
        }

        const consumerChannel = this._ch.getChannel();
        return Observable.fromPromise(
            this._ch.getChannel().consume(this.getName(), message => {
                events.message.emit('received', message);
                const storeMessage = MessageStore.addMessage(message);
                try {
                    const _message: RabbitMessage = options.decodeMessageContent
                        ? Object.assign({}, message, {
                            content: decodeJSONContent(message, this._forceJsonDecode || options.force_json_decode)
                        })
                        : message;

                    debug(`new message on queue ${this.getName()}`, _message.fields.deliveryTag);

                    return _dispatcher(consumerChannel, _message, { queue: this._queueWrapper }).switchMap(dispatch => {
                        if (typeof dispatch !== 'function') {
                            debug('dispatcher did not returned a function, call default dispatch');
                            return defaultDispatch(_message, this._ch, { queue: this._queueWrapper });
                        } else {
                            return dispatch();
                        }
                    }).subscribe(
                        _ => {
                            try {
                                this.handleMessageResult(message, _, consumerChannel);
                            } catch (err) {
                                /* istanbul ignore next */
                                events.queueManager.emit('ack_error', err);
                            }
                            MessageStore.remove(storeMessage);
                        },
                        err => {
                            this.handleMessageError(message, { storeMessage, options, err, consumerChannel });
                        }
                    );
                } catch (err) {
                    this.handleMessageError(message, { storeMessage, options, err, consumerChannel });
                }
            })
        )
        .do(() => this._consuming = true)
        .do(({ consumerTag }) => this._consumerTag = consumerTag)
        .do(res => MessageStore.addConsumer(consumerChannel, res.consumerTag))
        .do(res => {
            // If channel is closed, has en error or is reconnected the consumerTag is not valid
            // and needs to be removed
            ['close', 'error', 'reconnected'].forEach(event => this._ch.once(event, () => {
                debug('removing consumer', res.consumerTag);
                MessageStore.removeConsumer(res.consumerTag);
            }));
        });
    }

    cancel() {
        if (!this._consuming) {
            return Observable.of(null);
        }

        return Observable
            .fromPromise(this._ch.getChannel().cancel(this._consumerTag))
            .do(() => MessageStore.removeConsumer(this._consumerTag))
            .do(() => this._consuming = false);
    }

    handleMessageError(
        message: RabbitMessage,
        { storeMessage, options, err, consumerChannel }:
        { storeMessage: StoreMessage,
            options: { errorHandler: (err: Error, message: RabbitMessage, ch: ChannelInterface) => {} },
            err: Error, consumerChannel: ChannelInterface }
    ) {
        if (MessageStore.isShutdownRunning()) {
            consumerChannel.reject(message, true);
        } else {
            (typeof options.errorHandler === 'function' ?
            options.errorHandler(err, message, consumerChannel) : errorHandler(err));
            consumerChannel.reject(message, false);
        }

        MessageStore.remove(storeMessage);
    }

    handleMessageResult(message: RabbitMessage, result: MessageResult, consumerChannel: ChannelInterface): void {
        if (result === false) {
            debug('dispatcher returned false, not acking/rejecting message');
            return;
        }

        if (typeof result === 'object' && result) {
            if (result.ack) {
                debug('message ack', message.fields.consumerTag, message.fields.deliveryTag);
                consumerChannel.ack(message);
                return;
            } else if (result.reject) {
                debug('message reject', message.fields.consumerTag, message.fields.deliveryTag);
                consumerChannel.reject(message, result.requeue);
                return;
            }
        }

        debug('fallback message ack');
        consumerChannel.ack(message);
    }

    createBinds(binds?: Array<Bind>): Observable<Replies.Empty> {
        let _binds: Array<Bind>;

        if (Array.isArray(binds)) {
            _binds = binds;
        } else if (Array.isArray(this._binds)) {
            _binds = this._binds;
        } else {
            return Observable.of(null);
        }

        return Observable.forkJoin(
            _binds.map(bind =>
                Array.isArray(bind.pattern) ?
                    Observable.forkJoin(bind.pattern
                        .map(pattern =>
                            this.bind(
                                extractMetadataByDecorator<ExchangeDecoratorInterface>(bind.exchange, 'Exchange').name, pattern))) :
                    this.bind(extractMetadataByDecorator<ExchangeDecoratorInterface>(bind.exchange, 'Exchange').name, bind.pattern)
            )
        ).map(_ => null);
    }

    bind(exchangeName, routingKey?: string): Observable<Replies.Empty> {
        debug(`binding queue ${this.getName()} on exchange ${exchangeName} with routingKey ${routingKey}`);
        return Observable.fromPromise(this._ch.getChannel().bindQueue(this.getName(), exchangeName, routingKey || ''));
    }

    check(): Observable<Replies.AssertQueue> {
        debug(`checking queue ${this.getName()} ...`);
        return Observable.fromPromise(this._ch.getChannel().checkQueue(this.getName()));
    }

    sendMessage(message: any, options: MessageOptions = {}): boolean {
        const _options = Object.assign(
            {
                queue: this.getName()
            },
            options
        );

        return sendMessage(this._ch.getChannel(), message, _options);
    }
}

import * as _pick from 'lodash.pick';
import { Observable } from 'rxjs';
import { Channel as ChannelInterface, Replies } from 'amqplib';
import { extractMetadataByDecorator, errorHandler } from '@hapiness/core';
import { sendMessage, decodeJSONContent } from '../message';
import { MessageResult, MessageOptions, RabbitMessage, QueueOptions, ConsumeOptions, QueueInterface } from '../interfaces';
import { Bind } from '../decorators';
import { ExchangeDecoratorInterface, ChannelManager } from '../index';
import { QueueWrapper } from './queue-wrapper';
import { events } from '../events';
import { MessageStore, StoreMessage } from './message-store';

const debug = require('debug')('hapiness:rabbitmq');
export const QUEUE_OPTIONS = ['durable', 'exclusive', 'autoDelete', 'arguments'];

export class QueueManager {
    private _ch: ChannelManager;
    private _name: string;
    private _queue: QueueInterface;
    private _binds: Array<Bind>;
    private _forceJsonDecode: boolean;
    private _isAsserted: boolean;
    private _options;

    constructor(ch: ChannelManager, queue: QueueWrapper | QueueOptions) {
        this._ch = ch;

        if (queue instanceof QueueWrapper) {
            this._queue = queue.getInstance();
            this._name = queue.getName();
            this._binds = queue.getBinds();
            this._options = _pick(queue.getAssertOptions(), QUEUE_OPTIONS);
            this._forceJsonDecode = queue.getForceJsonDecode();
        } else if (typeof queue === 'object') {
            this._name = queue.name;
            this._binds = queue.binds;
            this._options = _pick(queue.options || {}, QUEUE_OPTIONS);
            this._forceJsonDecode = queue.force_json_decode || false;
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

    consume(
        _dispatcher?: (ch: ChannelInterface, message: RabbitMessage) => Observable<() => Observable<MessageResult>>,
        options: ConsumeOptions = { decodeMessageContent: true, errorHandler: null, force_json_decode: false }
    ): Observable<Replies.Consume> {
        debug(`consuming queue ${this.getName()}...`);
        if (typeof options.decodeMessageContent !== 'boolean') {
            options.decodeMessageContent = true;
        }

        let dispatcher = _dispatcher;
        let defaultDispatch: (message: RabbitMessage, ch) => Observable<MessageResult>;
        if (typeof this._queue['onMessage'] !== 'function') {
            defaultDispatch = (message: RabbitMessage, ch): Observable<MessageResult>  => {
                // message not dispatched
                debug('message not dispatched', message);
                events.queueManager.emit('message_not_dispatched', message, ch);
                return Observable.of({ ack: true });
            };
        } else {
            defaultDispatch = this._queue['onMessage'].bind(this._queue);
        }

        if (typeof _dispatcher !== 'function') {
            dispatcher = (ch: ChannelInterface, message: RabbitMessage) => Observable.of(() => defaultDispatch(message, ch));
        }

        // Reconsume queue when channel is reconnected
        this._ch.on('reconnected', () => {
            this._consume({ dispatcher, options, defaultDispatch });
        });
        return this._consume({ dispatcher, options, defaultDispatch });
    }

    private _consume({
        dispatcher,
        options,
        defaultDispatch
    }): Observable<Replies.Consume> {
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

                    return dispatcher(consumerChannel, _message).switchMap(dispatch => {
                        if (typeof dispatch !== 'function') {
                            debug('dispatcher did not returned a function, using defaultDispatcher');
                            return defaultDispatch(_message, this._ch);
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

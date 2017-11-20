import * as _pick from 'lodash.pick';
import { Observable } from 'rxjs';
import { Channel as ChannelInterface, Replies } from 'amqplib';
import { sendMessage, decodeJSONContent } from '../message';
import { MessageResult, MessageOptions, RabbitMessage, QueueOptions, ConsumeOptions, QueueInterface } from '../interfaces';
import { Bind } from '../decorators';
import { extractMetadataByDecorator, errorHandler } from '@hapiness/core';
import { ExchangeDecoratorInterface } from '../index';
import { QueueWrapper } from './queue-wrapper';
import { events } from '../events';

const debug = require('debug')('hapiness:rabbitmq');
export const QUEUE_OPTIONS = ['durable', 'exclusive', 'autoDelete', 'arguments'];

export class QueueManager {
    private _ch: ChannelInterface;
    private _name: string;
    private _queue: QueueInterface;
    private _binds: Array<Bind>;
    private _forceJsonDecode: boolean;
    private _isAsserted: boolean;
    private _options;

    constructor(ch: ChannelInterface, queue: QueueWrapper | QueueOptions) {
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

    assert(): Observable<QueueManager> {
        const obs = Observable.fromPromise(this._ch.assertQueue(this.getName(), this._options));
        debug(`asserting queue ${this.getName()}...`);
        return obs.map(_ => {
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

        return Observable.fromPromise(
            this._ch.consume(this.getName(), message => {
                try {
                    const _message: RabbitMessage = options.decodeMessageContent
                        ? Object.assign({}, message, {
                            content: decodeJSONContent(message, this._forceJsonDecode || options.force_json_decode)
                        })
                        : message;

                    debug(`new message on queue ${this.getName()}`, _message);

                    return dispatcher(this._ch, _message).switchMap(dispatch => {
                        if (typeof dispatch !== 'function') {
                            debug('dispatcher did not returned a function, using defaultDispatcher');
                            return defaultDispatch(_message, this._ch);
                        } else {
                            return dispatch();
                        }
                    }).subscribe(
                        _ => this.handleMessageResult(message, _),
                        err => {
                            (typeof options.errorHandler === 'function' ?
                            options.errorHandler(err, message, this._ch) : errorHandler(err));
                            this._ch.reject(message, false);
                        }
                    );
                } catch (err) {
                    (typeof options.errorHandler === 'function' ? options.errorHandler(err, message, this._ch) : errorHandler(err));
                    events.queueManager.emit('consume_message_error', err, message, this._ch);
                    this._ch.reject(message, false);
                }
            })
        );
    }

    handleMessageResult(message, result: MessageResult): void {
        if (result === false) {
            debug('dispatcher returned false, not acking/rejecting message');
            return;
        }

        if (typeof result === 'object' && result) {
            if (result.ack) {
                debug('message ack');
                this._ch.ack(message);
                return;
            } else if (result.reject) {
                this._ch.reject(message, result.requeue);
                return;
            }
        }

        debug('fallback message ack');
        this._ch.ack(message);
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
        return Observable.fromPromise(this._ch.bindQueue(this.getName(), exchangeName, routingKey || ''));
    }

    check(): Observable<Replies.AssertQueue> {
        return Observable.fromPromise(this._ch.checkQueue(this.getName()));
    }

    sendMessage(message: any, options: MessageOptions = {}): boolean {
        const _options = Object.assign(
            {
                queue: this.getName()
            },
            options
        );

        return sendMessage(this._ch, message, _options);
    }
}

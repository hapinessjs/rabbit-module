import * as _pick from 'lodash.pick';
import { Observable } from 'rxjs';
import { Channel as ChannelInterface, Replies } from 'amqplib';
import { sendMessage, decodeContent } from '../message';
import { MessageResult, MessageOptions, RabbitMessage, QueueOptions, ConsumeOptions, QueueInterface } from '../interfaces';
import { Bind } from '../decorators';
import { extractMetadataByDecorator, errorHandler } from '@hapiness/core/core';
import { ExchangeDecoratorInterface } from '../index';
import { QueueWrapper } from './queue-wrapper';

const debug = require('debug')('hapiness:rabbitmq');
export const QUEUE_OPTIONS = ['durable', 'exclusive', 'autoDelete', 'arguments'];

export class QueueManager {
    private _ch: ChannelInterface;
    private _name: string;
    private _queue: QueueInterface;
    private _binds: Array<Bind>;
    private _isAsserted: boolean;
    private _options;

    constructor(ch: ChannelInterface, queue: QueueWrapper | QueueOptions) {
        this._ch = ch;

        if (queue instanceof QueueWrapper) {
            this._queue = queue.getInstance();
            this._name = queue.getName();
            this._binds = queue.getBinds();
            this._options = _pick(queue.getAssertOptions(), QUEUE_OPTIONS);
        } else if (typeof queue === 'object') {
            this._name = queue.name;
            this._binds = queue.binds;
            this._options = _pick(queue.options || {}, QUEUE_OPTIONS);
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
        dispatcher?: (ch: ChannelInterface, message: RabbitMessage) => Observable<MessageResult>,
        options: ConsumeOptions = { decodeMessageContent: true, errorHandler: null }
    ): Observable<Replies.Consume> {
        debug(`consuming queue ${this.getName()}...`);
        if (typeof options.decodeMessageContent !== 'boolean') {
            options.decodeMessageContent = true;
        }

        return Observable.fromPromise(
            this._ch.consume(this.getName(), message => {
                const _message: RabbitMessage = options.decodeMessageContent
                    ? Object.assign({}, message, {
                          content: decodeContent(message)
                      })
                    : message;

                debug(`new message on queue ${this.getName()}`, _message);

                let obs: Observable<MessageResult>;
                if (typeof dispatcher === 'function') {
                    debug('use dispatcher');
                    obs = dispatcher(this._ch, _message);
                } else if (this._queue && this._queue['onMessage']) {
                    debug('consume message on queue');
                    obs = this._queue['onMessage'](_message);
                } else {
                    throw new Error(`Specifiy a dispatcher or onMessage method for your queue`);
                }

                return obs.subscribe(
                    _ => this.handleMessageResult(message, _),
                    err => (typeof options.errorHandler === 'function' ? options.errorHandler(err, message, this._ch) : errorHandler(err))
                );
            })
        );
    }

    handleMessageResult(message, result): void {
        if (result === false) {
            debug('dispatcher returned false, not acking/rejecting message');
            return;
        }

        if (result.ack) {
            debug('message ack');
            this._ch.ack(message);
        } else if (result.reject) {
            debug('message reject');
            this._ch.reject(message, result.requeue);
        } else {
            debug('message ack');
            this._ch.ack(message);
        }
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
                this.bind(extractMetadataByDecorator<ExchangeDecoratorInterface>(bind.exchange, 'Exchange').name, bind.pattern)
            )
        ).map(_ => null);
    }

    bind(exchangeName, routingKey?: string): Observable<Replies.Empty> {
        debug(`binding queue ${this.getName()} on exchange ${exchangeName} with routingKey ${routingKey}`);
        return Observable.fromPromise(this._ch.bindQueue(this.getName(), exchangeName, routingKey));
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

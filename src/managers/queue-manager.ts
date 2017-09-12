import * as _pick from 'lodash.pick';
import { Observable } from 'rxjs';
import { Channel as ChannelInterface, Replies } from 'amqplib';
import { sendMessage, decodeContent } from '../Message';
import { MessageResult, MessageOptions, RabbitMessage, QueueOptions, ConsumeOptions } from '../interfaces';
import { Bind } from '../decorators';
import { extractMetadataByDecorator, errorHandler } from '@hapiness/core/core';
import { ExchangeDecoratorInterface } from '../index';
import { QueueWrapper } from './queue-wrapper';

const debug = require('debug')('hapiness:rabbitmq');
export const QUEUE_OPTIONS = ['durable', 'exclusive', 'autoDelete', 'arguments'];

export class QueueManager<T extends QueueWrapper = QueueWrapper> {
    private ch: ChannelInterface;
    private name: string;
    private queue;
    private binds: Array<Bind>;
    private _isAsserted: boolean;
    private options;

    constructor(ch: ChannelInterface, queue: T | QueueOptions) {
        this.ch = ch;

        if (queue instanceof QueueWrapper) {
            this.queue = queue.getInstance();
            this.name = queue.getName();
            this.binds = queue.getBinds();
            this.options = _pick(queue.getAssertOptions(), QUEUE_OPTIONS);
        } else if (typeof queue === 'object') {
            this.name = queue.name;
            this.binds = queue.binds;
            this.options = _pick(queue.options || {}, QUEUE_OPTIONS);
        } else {
            throw new Error('Invalid queue parameter');
        }

        this._isAsserted = false;
    }

    getName(): string {
        return this.name;
    }

    assert(): Observable<QueueManager> {
        const obs = Observable.fromPromise(this.ch.assertQueue(this.getName(), this.options));
        debug(`asserting queue ${this.getName()}...`);
        return obs.map(_ => {
            this._isAsserted = true;
            debug(`... queue ${this.getName()} asserted`);

            if (this.queue && typeof this.queue['onAsserted'] === 'function') {
                debug('fire onAsserted method');
                this.queue['onAsserted']();
            }

            return this;
        });
    }

    isAsserted() {
        return this._isAsserted;
    }

    consume(
        dispatcher?: (ch: ChannelInterface, message: RabbitMessage) => Observable<MessageResult>,
        options: ConsumeOptions = { decodeMessageContent: true, errorHandler: null }
    ) {
        debug(`consuming queue ${this.getName()}...`);
        if (typeof options.decodeMessageContent !== 'boolean') {
            options.decodeMessageContent = true;
        }

        return this.ch.consume(this.getName(), message => {
            const _message: RabbitMessage = options.decodeMessageContent
                ? Object.assign({}, message, {
                      content: decodeContent(message)
                  })
                : message;

            debug(`new message on queue ${this.getName()}`, _message);

            let obs: Observable<MessageResult>;
            if (typeof dispatcher === 'function') {
                debug('use dispatcher');
                obs = dispatcher(this.ch, _message);
            } else if (this.queue && this.queue['onMessage']) {
                debug('consume message on queue');
                obs = this.queue['onMessage'](_message);
            } else {
                throw new Error(`Specifiy a dispatcher or onMessage method for your queue`);
            }

            return obs.subscribe(
                _ => this.handleMessageResult(message, _),
                err => (typeof options.errorHandler === 'function' ? options.errorHandler(err, message, this.ch) : errorHandler(err))
            );
        });
    }

    handleMessageResult(message, result) {
        if (result === false) {
            debug('dispatcher returned false, not acking/rejecting message');
            return;
        }

        if (result.ack) {
            debug('message ack');
            this.ch.ack(message);
        } else if (result.reject) {
            debug('message reject');
            this.ch.reject(message, result.requeue);
        } else {
            debug('message ack');
            this.ch.ack(message);
        }
    }

    createBinds(binds?: Array<Bind>): Observable<Replies.Empty> {
        let _binds: Array<Bind>;

        if (Array.isArray(binds)) {
            _binds = binds;
        } else if (Array.isArray(this.binds)) {
            _binds = this.binds;
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
        return Observable.fromPromise(this.ch.bindQueue(this.getName(), exchangeName, routingKey));
    }

    check() {
        return Observable.fromPromise(this.ch.checkQueue(this.getName()));
    }

    sendMessage(message: any, options: MessageOptions = {}) {
        const _options = Object.assign(
            {
                queue: this.getName()
            },
            options
        );

        return sendMessage(this.ch, message, _options);
    }
}

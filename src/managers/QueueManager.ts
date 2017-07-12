import * as R from 'ramda';
import { Observable } from 'rxjs';
import { Channel as ChannelInterface, Connection as ConnectionInterface, Options, Replies } from 'amqplib';
import { sendMessage, decodeContent } from '../Message';
import { ExchangeManager, ExchangeBase } from './ExchangeManager';
import { MessageResult, MessageOptions, RabbitMessage } from '../Message';
import { QueueDecoratorInterface, Bind } from '../decorators';
import { OnAsserted } from "../shared";
import { extractMetadataByDecorator } from "@hapiness/core/core";
import { Injectable } from "@hapiness/core";

const debug = require('debug')('hapiness:rabbitmq');
export const QUEUE_OPTIONS = ['durable', 'exclusive', 'autoDelete', 'arguments'];

export interface ConsumeOptions {
    decodeMessageContent: boolean;
};

export abstract class QueueBase {

    public getMeta(): QueueDecoratorInterface {
        const base: any = this.constructor;
        return extractMetadataByDecorator<QueueDecoratorInterface>(base, 'Queue');
    }

    static getMeta(): QueueDecoratorInterface {
        return extractMetadataByDecorator<QueueDecoratorInterface>(this, 'Queue');
    }

    public getAssertOptions(): Options.AssertExchange {
        try {
            return this.getMeta().options;
        } catch (err) {
            return null;
        }
    }

    public getName() {
        try {
            return this.getMeta().name;
        } catch (err) {
            return null;
        }
    }

    public getBinds() {
        try {
            return this.getMeta().binds;
        } catch (err) {
            return null;
        }
    }

}

export class GenericQueue extends QueueBase {}

export interface QueueOptions {
    name: string;
    binds?: Array<Bind>;
    options?: Options.AssertQueue
};

export class QueueManager<T extends QueueBase = QueueBase> {
    private ch: ChannelInterface;
    private name: string;
    private queue: QueueBase;
    private binds: Array<Bind>;
    private type: string;
    private _isAsserted: boolean;
    private options;

    constructor(ch: ChannelInterface, queue: T | QueueOptions) {
        this.ch = ch;

        if (queue instanceof QueueBase) {
            this.queue = queue;
            this.name = queue.getName();
            this.binds = queue.getBinds();
            this.options = R.pick(QUEUE_OPTIONS, queue.getAssertOptions());
        } else if (typeof queue === 'object') {
            this.name = queue.name;
            this.binds = queue.binds;
            this.options = R.pick(QUEUE_OPTIONS, queue.options || {});
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

    consume(dispatcher?: (ch: ChannelInterface, message: RabbitMessage) => Observable<MessageResult>, options: ConsumeOptions = { decodeMessageContent: true }) {
        debug(`consuming queue ${this.getName()}...`);
        return this.ch.consume(this.getName(), (message) => {
            const _message: RabbitMessage = options.decodeMessageContent ? Object.assign({}, message, { content: decodeContent(message) }) : message;

            debug(`new message on queue ${this.getName()}`, _message);

            let obs;
            if (typeof dispatcher === 'function') {
                obs = dispatcher(this.ch, _message);
            } else if (this.queue && this.queue['onMessage']) {
                debug('consume message on queue');
                obs = this.queue['onMessage'](_message);
            } else {
                throw new Error(`Specifiy a dispatcher or onMessage method for your queue ${this.queue}`);
            }

            debug('use dispatcher');
            obs.subscribe(_ => {
                if (_ === false) {
                    debug('dispatcher returned false, not acking/rejecting message');
                    return;
                }

                if (_.ack) {
                    debug('message ack');
                    this.ch.ack(message);
                } else if (_.reject) {
                    debug('message reject');
                    this.ch.reject(message, _.requeue);
                } else {
                    debug('message ack');
                    this.ch.ack(message);
                }
            });
        });
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

        return Observable
            .forkJoin(_binds.map(bind => this.bind(bind.exchange, bind.pattern)))
            .map(_ => null);
    }

    /**
     * @TODO: It would be good to verify the exchange is asserted before binding to avoid borking the rabbitmq channel
     *        We would need to get/create an Exchange instance and verify it's asserted. We only need to assert it once per exchange.
      */
    bind(exchange: string | typeof ExchangeBase, routingKey?: string): Observable<Replies.Empty> {
        let exchangeName;
        if (typeof exchange === 'string') {
            exchangeName = exchange;
        } else {
            exchangeName = exchange.getMeta().name;
        }

        debug(`binding queue ${this.getName()} on exchange ${exchangeName} with routingKey ${routingKey}`);
        return Observable.fromPromise(this.ch.bindQueue(this.getName(), exchangeName, routingKey));
    }

    check() {
        return Observable.fromPromise(this.ch.checkQueue(this.getName()));
    }

    // Shortcut
    sendMessage(message: any, options: MessageOptions = {}) {
        const _options = Object.assign({
            queue: this.getName()
        }, options);

        return sendMessage(this.ch, message, _options);
    }

}

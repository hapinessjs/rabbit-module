import * as R from 'ramda';
import { Observable } from 'rxjs';
import { Channel as ChannelInterface, Connection as ConnectionInterface, Options } from 'amqplib';
import { sendMessage, MessageOptions } from '../Message';
import { ExchangeDecoratorInterface } from "../decorators";
import { OnAsserted } from '../shared';
import { extractMetadataByDecorator } from "@hapiness/core/core";
import { Injectable } from "@hapiness/core";

const debug = require('debug')('hapiness:rabbitmq');
export const EXCHANGE_OPTIONS = ['durable', 'alternateExchange', 'autoDelete', 'arguments'];

export enum ExchangeType {
    Direct = "direct",
    Topic = "topic",
    Fanout = "fanout"
};

export interface ExchangeOptions {
    name: string,
    type: ExchangeType,
    options?: Options.AssertExchange
};

export abstract class ExchangeBase {

    public getMeta(): ExchangeDecoratorInterface {
        const base: any = this.constructor;
        return extractMetadataByDecorator<ExchangeDecoratorInterface>(base, 'Exchange');
    }

    static getMeta(): ExchangeDecoratorInterface {
        return extractMetadataByDecorator<ExchangeDecoratorInterface>(this, 'Exchange');
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

}

export class GenericExchange extends ExchangeBase {}

export class ExchangeManager<T extends ExchangeBase = ExchangeBase> {

    private ch: ChannelInterface;
    private name: string;
    private exchange: T;
    private type: ExchangeType;
    private options;
    private _isAsserted: boolean;

    constructor(ch: ChannelInterface, exchange: T | ExchangeOptions) {
        this.ch = ch;

        if (exchange instanceof ExchangeBase) {
            this.exchange = exchange;
            this.name = this.exchange.getName();
            this.type = this.exchange.getMeta().type;
            this.options = R.pick(this.exchange.getAssertOptions());
        } else if (typeof exchange === 'object') {
            this.name = exchange.name;
            this.type = exchange.type;
            this.options = R.pick(EXCHANGE_OPTIONS, exchange.options || {});
        } else {
            throw new Error('Invalid exchange parameter');
        }

        this._isAsserted = false;
    }

    getName(): string {
        return this.name;
    }

    assert(): Observable<ExchangeManager<T>> {
        debug(`asserting exchange ${this.getName()} ...`);
        const obs = Observable.fromPromise(this.ch.assertExchange(this.getName(), this.type.toString(), this.options));
        return obs.map(_ => {
            this._isAsserted = true;

            debug(`... exchange ${this.getName()} asserted`);

            if (this.exchange && typeof this.exchange['onAsserted'] === 'function') {
                debug('fire onAsserted method');
                this.exchange['onAsserted']();
            }

            return this;
        });
    }

    isAsserted() {
        return this._isAsserted;
    }

    check(): Observable<any> {
        return Observable.fromPromise(this.ch.checkExchange(this.getName()));
    }

    // Shortcut
    sendMessage(message: any, options: MessageOptions = {}) {
        const _options = Object.assign({
            exchange: this.getName(),
            routingKey: null,
        }, options);

        return sendMessage(this.ch, message, _options);
    }

}

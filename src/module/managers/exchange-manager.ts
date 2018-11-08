import * as _pick from 'lodash.pick';
import { Observable } from 'rxjs';
import { Channel as ChannelInterface, Options, Replies } from 'amqplib';
import { sendMessage } from '../message';
import { ExchangeType, MessageOptions, ExchangeInterface } from '../interfaces';
import { ExchangeWrapper } from './exchange-wrapper';

const debug = require('debug')('hapiness:rabbitmq');
export const EXCHANGE_OPTIONS = ['durable', 'alternateExchange', 'autoDelete', 'arguments'];

export interface ExchangeOptions {
    name: string;
    type: ExchangeType;
    options?: Options.AssertExchange;
}

export class ExchangeManager {
    private _ch: ChannelInterface;
    private _name: string;
    private _exchange: ExchangeInterface;
    private _type: ExchangeType;
    private _options;
    private _isAsserted: boolean;

    constructor(ch: ChannelInterface, exchange: ExchangeWrapper | ExchangeOptions) {
        this._ch = ch;

        if (exchange instanceof ExchangeWrapper) {
            this._exchange = exchange.getInstance();
            this._name = exchange.getName();
            this._type = exchange.getMeta().type;
            this._options = _pick(exchange.getAssertOptions(), EXCHANGE_OPTIONS);
        } else if (typeof exchange === 'object') {
            this._name = exchange.name;
            this._type = exchange.type;
            this._options = _pick(exchange.options || {}, EXCHANGE_OPTIONS);
        } else {
            throw new Error('Invalid exchange parameter');
        }

        this._isAsserted = false;
    }

    getName(): string {
        return this._name;
    }

    assert(): Observable<ExchangeManager> {
        debug(`asserting exchange ${this.getName()} ...`);
        const obs = Observable.fromPromise(this._ch.assertExchange(this.getName(), this._type.toString(), this._options));
        return obs.map(_ => {
            this._isAsserted = true;

            debug(`... exchange ${this.getName()} asserted`);

            if (this._exchange && typeof this._exchange['onAsserted'] === 'function') {
                debug('fire onAsserted method');
                this._exchange['onAsserted']();
            }

            return this;
        });
    }

    isAsserted(): boolean {
        return this._isAsserted;
    }

    check(): Observable<Replies.Empty> {
        debug(`checking exchange ${this.getName()} ...`);
        return Observable.fromPromise(this._ch.checkExchange(this.getName()));
    }

    // Shortcut
    sendMessage(message: any, options: MessageOptions = {}): boolean {
        const _options = Object.assign(
            {
                exchange: this.getName(),
                routingKey: null
            },
            options
        );

        return sendMessage(this._ch, message, _options);
    }
}

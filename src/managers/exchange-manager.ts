import * as _pick from 'lodash.pick';
import { Observable } from 'rxjs';
import { Channel as ChannelInterface, Options } from 'amqplib';
import { sendMessage } from '../Message';
import { ExchangeType, MessageOptions } from '../interfaces/index';
import { ExchangeWrapper } from './exchange-wrapper';

const debug = require('debug')('hapiness:rabbitmq');
export const EXCHANGE_OPTIONS = ['durable', 'alternateExchange', 'autoDelete', 'arguments'];

export interface ExchangeOptions {
    name: string;
    type: ExchangeType;
    options?: Options.AssertExchange;
}

export class ExchangeManager<T extends ExchangeWrapper = ExchangeWrapper> {
    private ch: ChannelInterface;
    private name: string;
    private exchange: T;
    private type: ExchangeType;
    private options;
    private _isAsserted: boolean;

    constructor(ch: ChannelInterface, exchange: T | ExchangeOptions) {
        this.ch = ch;

        if (exchange instanceof ExchangeWrapper) {
            this.exchange = exchange.getInstance();
            this.name = exchange.getName();
            this.type = exchange.getMeta().type;
            this.options = _pick(exchange.getAssertOptions(), EXCHANGE_OPTIONS);
        } else if (typeof exchange === 'object') {
            this.name = exchange.name;
            this.type = exchange.type;
            this.options = _pick(exchange.options || {}, EXCHANGE_OPTIONS);
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
        const _options = Object.assign(
            {
                exchange: this.getName(),
                routingKey: null
            },
            options
        );

        return sendMessage(this.ch, message, _options);
    }
}

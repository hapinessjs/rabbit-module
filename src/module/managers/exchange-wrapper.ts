import { ExchangeDecoratorInterface } from '../decorators';
import { Options } from 'amqplib';
import { ExchangeInterface } from '../interfaces';

export class ExchangeWrapper {
    private _meta: ExchangeDecoratorInterface;
    private _instance: ExchangeInterface;

    constructor(instance: ExchangeInterface, meta: ExchangeDecoratorInterface) {
        this._instance = instance;
        this._meta = meta;
    }

    public getMeta(): ExchangeDecoratorInterface {
        return this._meta;
    }

    public getAssertOptions(): Options.AssertExchange {
        try {
            return this.getMeta().options;
        } catch (err) {
            return null;
        }
    }

    public getName(): string {
        try {
            return this.getMeta().name;
        } catch (err) {
            return null;
        }
    }

    getInstance(): ExchangeInterface {
        return this._instance;
    }
}

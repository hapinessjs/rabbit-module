import { ExchangeDecoratorInterface } from '../decorators';
import { Options } from 'amqplib';

export class ExchangeWrapper {
    private meta: ExchangeDecoratorInterface;
    private instance;

    constructor(instance, meta: ExchangeDecoratorInterface) {
        this.instance = instance;
        this.meta = meta;
    }

    public getMeta(): ExchangeDecoratorInterface {
        return this.meta;
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

    getInstance() {
        return this.instance;
    }
}

import { QueueDecoratorInterface } from '../decorators';
import { Options } from 'amqplib';

export class QueueWrapper {
    private instance: any;
    private meta: QueueDecoratorInterface;

    constructor(instance, meta: QueueDecoratorInterface) {
        this.instance = instance;
        this.meta = meta;
    }

    public getMeta(): QueueDecoratorInterface {
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

    public getBinds() {
        try {
            return this.getMeta().binds;
        } catch (err) {
            return null;
        }
    }

    getInstance() {
        return this.instance;
    }
}

import { QueueDecoratorInterface, Bind } from '../decorators';
import { Options } from 'amqplib';
import { QueueInterface } from '../interfaces';

export class QueueWrapper {
    private _instance: QueueInterface;
    private _meta: QueueDecoratorInterface;

    constructor(instance: QueueInterface, meta: QueueDecoratorInterface) {
        this._instance = instance;
        this._meta = meta;
    }

    public getMeta(): QueueDecoratorInterface {
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

    public getBinds(): Array<Bind> {
        try {
            return this.getMeta().binds;
        } catch (err) {
            return null;
        }
    }

    public getForceJsonDecode(): boolean {
        try {
            return Boolean(this.getMeta().force_json_decode);
        } catch (err) {
            return false;
        }
    }

    getInstance(): QueueInterface {
        return this._instance;
    }
}

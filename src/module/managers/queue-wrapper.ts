import { Type } from '@hapiness/core';
import { Options } from 'amqplib';
import { QueueDecoratorInterface } from '../decorators';
import { QueueInterface, Bind } from '../interfaces';

export class QueueWrapper {
    private _instance: QueueInterface;
    private _meta: QueueDecoratorInterface;
    private _token: Type<QueueInterface>;

    constructor(instance: QueueInterface, metadata: { token: Type<QueueInterface>, data: QueueDecoratorInterface }) {
        this._instance = instance;
        const { data, token } = metadata;
        this._meta = data;
        this._token = token;
    }

    public getMeta(): QueueDecoratorInterface {
        return this._meta;
    }

    public getToken(): Type<QueueInterface> {
        return this._token;
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

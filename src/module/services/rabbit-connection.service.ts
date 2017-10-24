import { Injectable, Inject } from '@hapiness/core';
import { RabbitMQExt } from '../rabbitmq.extension';
import { ConnectionManager } from '../managers';
import { Connection } from 'amqplib';

@Injectable()
export class RabbitConnectionService {
    constructor(@Inject(RabbitMQExt) private _connectionManager) {}

    public get connectionManager(): ConnectionManager {
        return this._connectionManager;
    }

    public get connection(): Connection {
        return this.connectionManager.connection;
    }
}

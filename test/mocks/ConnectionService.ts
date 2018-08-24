import { ConnectionManager } from '../../src';
import { ConnectionManagerMock } from './ConnectionManager';
import { Connection } from 'amqplib';
import { Injectable, Inject } from '@hapiness/core';
import { RabbitMQExt } from '../../src/module/rabbitmq.extension';

@Injectable()
export class ConnectionServiceMock {
    constructor(@Inject(RabbitMQExt) private _connectionManager: ConnectionManagerMock) {}

    public get connectionManager(): ConnectionManager {
        return this._connectionManager;
    }

    public get connection(): Connection {
        return this._connectionManager.connection;
    }
}

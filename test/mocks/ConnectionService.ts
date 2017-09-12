import { ConnectionManager } from '../../src/index';
import { ConnectionManagerMock } from './ConnectionManager';
import { Connection } from 'amqplib';
import { Injectable, Inject } from '@hapiness/core';
import { RabbitMQExt } from '../../src/extension';

@Injectable()
export class ConnectionServiceMock {
    constructor(@Inject(RabbitMQExt) private _connectionManager: ConnectionManagerMock) {}

    public get connectionManager(): ConnectionManager {
        return this._connectionManager;
    }

    public get connection(): Connection {
        return this._connectionManager.getConnection();
    }
}

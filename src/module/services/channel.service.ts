import { Injectable } from '@hapiness/core';
import { Channel } from 'amqplib';
import { Observable } from 'rxjs';
import { RabbitConnectionService } from './rabbit-connection.service';
import { ChannelManager, ConnectionManager } from '../managers';
import { CreateChannelOptions } from '../interfaces';

@Injectable()
export class ChannelService {
    private _connectionManager: ConnectionManager;

    constructor(private _connectionService: RabbitConnectionService) {
        if (!this._connectionService.connectionManager.isConnected()) {
            throw new Error('Connect to RabbitMQ before using ChannelService');
        }

        this._connectionManager = this._connectionService.connectionManager;
    }

    get connectionManager(): ConnectionManager {
        return this._connectionManager;
    }

    public create(key: string = 'default', { prefetch, global }: CreateChannelOptions = {}): Observable<ChannelManager> {
        return this._connectionManager.channelStore.create(key, { prefetch, global });
    }

    public upsert(key: string = 'default', { prefetch, global }: CreateChannelOptions = {}): Observable<ChannelManager> {
        return this._connectionManager.channelStore.upsert(key, { prefetch, global });
    }

    public get(key: string = 'default'): ChannelManager | undefined {
        return this._connectionManager.channelStore.get(key);
    }

    public getChannel(key: string = 'default'): Channel {
        return this._connectionManager.channelStore.getChannel(key);
    }
}

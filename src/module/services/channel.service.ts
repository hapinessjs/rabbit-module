import { ChannelManager, ConnectionManager } from '../managers';
import { Injectable } from '@hapiness/core';
import { Channel } from 'amqplib';
import { Observable } from 'rxjs';
import { RabbitConnectionService } from './rabbit-connection.service';

export interface CreateChannelOptions {
    prefetch?: number;
    global?: boolean;
}

@Injectable()
export class ChannelService {
    private _channels = {};
    private _connectionManager: ConnectionManager;

    constructor(private _connectionService: RabbitConnectionService) {
        if (!this._connectionService.connectionManager.isConnected()) {
            throw new Error('Connect to RabbitMQ before using ChannelService');
        }

        this._connectionManager = this._connectionService.connectionManager;
        const channel = new ChannelManager(this._connectionManager);
        channel.setChannel(this._connectionService.connectionManager.defaultChannel);
        this._channels['default'] = channel;
    }

    public create(key = 'default', { prefetch, global }: CreateChannelOptions = {}): Observable<ChannelManager> {
        if (key === 'default') {
            return Observable.of(this.get(key));
        }

        const channel = new ChannelManager(this._connectionManager);
        return channel
            .create()
            .flatMap(ch => (isNaN(prefetch) ? Observable.of(ch) : channel.prefetch(prefetch, global).map(_ => ch)))
            .map(ch => {
                this._channels[key] = channel;
                return channel;
            });
    }

    public upsert(key = 'default', { prefetch, global }: CreateChannelOptions = {}): Observable<ChannelManager> {
        const ch = this.get(key);
        if (!ch) {
            return this.create(key, { prefetch, global });
        }

        return Observable.of(ch);
    }

    public get(key): ChannelManager | undefined {
        return this._channels[key];
    }

    public getChannel(key: string = 'default'): Channel {
        const channel = this.get(key);
        if (channel) {
            return channel.getChannel();
        }

        return null;
    }
}

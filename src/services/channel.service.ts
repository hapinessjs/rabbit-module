import { ChannelManager } from '../managers';
import { Injectable } from '@hapiness/core';
import { Channel, Connection } from 'amqplib';
import { Observable } from 'rxjs';
import { RabbitConnectionService } from './rabbit-connection.service';

export interface CreateChannelOptions {
    prefetch?: number;
    global?: boolean;
}

@Injectable()
export class ChannelService {
    private _channels = {};
    private connection: Connection;

    constructor(private _connectionService: RabbitConnectionService) {
        if (!this._connectionService.connectionManager.isConnected()) {
            throw new Error('Connect to RabbitMQ before using ChannelService');
        }

        this.connection = this._connectionService.connection;
        const channel = new ChannelManager(this.connection);
        channel.setChannel(this._connectionService.connectionManager.getDefaultChannel());
        this._channels['default'] = channel;
    }

    public create(key = 'default', { prefetch, global }: CreateChannelOptions = {}): Observable<ChannelManager> {
        if (key === 'default') {
            return Observable.of(this.get(key));
        }

        const channel = new ChannelManager(this.connection);
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

    public get(key): ChannelManager | null {
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

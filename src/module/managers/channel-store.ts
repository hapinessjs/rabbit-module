import { ConnectionManager } from './connection-manager';
import { ChannelManager } from './channel-manager';
import { Channel } from 'amqplib';
import { Observable } from 'rxjs';
import { CreateChannelOptions } from '../interfaces';

const debug = require('debug')('hapiness:rabbitmq');

export class ChannelStore {
    private _channels = {};
    private _connectionManager: ConnectionManager;

    constructor(connectionManager: ConnectionManager) {
        this._connectionManager = connectionManager;
    }

    public create(key = 'default', { prefetch, global }: CreateChannelOptions = {}): Observable<ChannelManager> {
        const existing = this.get(key);

        if (existing) {
            debug('channel existing returning', key);
            return Observable.of(existing);
        }

        debug('create channel', key, prefetch, global);
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

        debug('Get channel', key);

        if (channel) {
            return channel.getChannel();
        }

        return null;
    }
}

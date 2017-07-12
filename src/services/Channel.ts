import { ChannelManager } from '../managers/ChannelManager';
import { Injectable, Inject } from "@hapiness/core";
import { RabbitMQExt } from "../extension";
import { ConnectionManager } from "../managers/ConnectionManager";
import { Channel, Connection } from "amqplib";
import { Observable } from "rxjs";
import { ConnectionService } from "./Connection";

export interface CreateChannelOptions {
    key: string;
    prefetch?: number;
    global?: boolean;
};

@Injectable()
export class ChannelService {

    private _channels = {};
    private connection: Connection;

    constructor(private _connectionService: ConnectionService) {
        if (!this._connectionService.connectionManager.isConnected()) {
            throw new Error('Connect to RabbitMQ before using ChannelService');
        }

        this.connection = this._connectionService.connection;
        const channel = new ChannelManager(this.connection);
        channel.setChannel(this._connectionService.connectionManager.getDefaultChannel());
        this._channels['default'] = channel;
    }

    public create({ prefetch, global, key }: CreateChannelOptions): Observable<ChannelManager> {
        const channel = new ChannelManager(this.connection);
        return channel
            .create()
            .flatMap(ch => isNaN(prefetch) ? Observable.of(ch) : channel.prefetch(prefetch, global).map(_ => ch))
            .map(ch => {
                this._channels[key] = channel;
                return channel;
            });
    }

    public upsert({ prefetch, global, key }: CreateChannelOptions = { key: 'default' }): Observable<ChannelManager> {
        const ch = this.get(key);
        if (!ch) {
            return this.create({ prefetch, global, key });
        }

        return Observable.of(ch);
    }

    public get(key): ChannelManager | null {
        return this._channels[key];
    }

    public getChannel(key: string = 'default') {
        const channel = this.get(key);
        if (channel) {
            return channel.getChannel();
        }

        return null;
    }
}

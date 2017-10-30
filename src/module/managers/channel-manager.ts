import { Observable } from 'rxjs';
import { Channel as ChannelInterface, Connection, Replies } from 'amqplib';
import { ConnectionManager } from './connection-manager';

export class ChannelManager {
    private _connectionManager: ConnectionManager;
    private _connection: Connection;
    private ch: ChannelInterface;

    constructor(connectionManager: ConnectionManager) {
        this._connectionManager = connectionManager;
        this._connection = connectionManager.connection;
    }

    public create(prefetch?: number, global?: boolean): Observable<ChannelInterface> {
        const obs = Observable.fromPromise(this._connection.createChannel());
        return obs.map(ch => {
            this.ch = ch;
            return ch;
        }).switchMap(ch => this.prefetch(prefetch, global).map(() => ch));
    }

    public prefetch(_count: number, global: boolean = false): Observable<Replies.Empty> {
        if (!this.ch) {
            return Observable.throw(new Error('Create channel before setting prefetch'));
        }

        const count = (_count === null || isNaN(_count)) ? this._connectionManager.getDefaultPrefetch() : _count;
        return Observable.fromPromise(this.ch.prefetch(count, global));
    }

    public setChannel(ch): ChannelManager {
        this.ch = ch;
        return this;
    }

    public getChannel(): ChannelInterface {
        return this.ch;
    }
}

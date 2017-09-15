import { Observable } from 'rxjs';
import { Channel as ChannelInterface, Connection, Replies } from 'amqplib';

export class ChannelManager {
    private _connection: Connection;
    private ch: ChannelInterface;

    constructor(connection: Connection) {
        this._connection = connection;
    }

    public create(): Observable<ChannelInterface> {
        const obs = Observable.fromPromise(this._connection.createChannel());
        return obs.map(ch => {
            this.ch = ch;
            return ch;
        });
    }

    public prefetch(count: number, global: boolean = false): Observable<Replies.Empty> {
        if (!this.ch) {
            return Observable.throw(new Error('Create channel before setting prefetch'));
        }

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

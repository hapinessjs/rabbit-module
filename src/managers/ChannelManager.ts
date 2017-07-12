import { Observable } from 'rxjs';
import { Channel as ChannelInterface, Connection, Replies } from 'amqplib';

export class ChannelManager {

    private connection: Connection;
    private ch: ChannelInterface;
    private _prefetch: number;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    public create() {
        const obs = Observable.fromPromise(this.connection.createChannel());
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

    public setChannel(ch) {
        this.ch = ch;
    }

    public getChannel() {
        return this.ch;
    }

}

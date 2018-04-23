import { Observable } from 'rxjs';
import { Channel as ChannelInterface, Connection, Replies } from 'amqplib';
import { ConnectionManager } from './connection-manager';
import * as EventEmitter from 'events';
import { MessageStore } from './message-store';

const debug = require('debug')('hapiness:rabbitmq');

export class ChannelManager extends EventEmitter {
    private _connectionManager: ConnectionManager;
    private _connection: Connection;
    private ch: ChannelInterface;
    private _isConnected: boolean;
    private _reconnecting: boolean;
    private _prefetch: number;
    private _global: boolean;
    private _key: any;

    constructor(connectionManager: ConnectionManager, prefetch?: number, global?: boolean) {
        super();
        this._connectionManager = connectionManager;
        this._connection = connectionManager.connection;
        this._prefetch = prefetch;
        this._global = global;
    }

    get prefetch(): number {
        return this._prefetch;
    }

    get global(): boolean {
        return this._global;
    }

    public canCreateChannel() {
        return this._connectionManager.isConnected() && !this._connectionManager.isConnecting() && !MessageStore.isShutdownRunning();
    }

    public create(): Observable<ChannelInterface> {
        const obs = Observable.fromPromise(this._connection.createChannel());
        return obs.map(ch => {
            this.ch = ch;
            this.ch.on('error', err => this.defaultErrorHandler(err, 'error'));
            this.ch.on('close', err => this.defaultErrorHandler(err, 'close'));
            this._key = new Date();
            debug('channel created');
            this._isConnected = true;
            this.emit('created');
            return ch;
        }).switchMap(ch => this.setPrefetch(this._prefetch, this._global).map(() => ch));
    }

    public setPrefetch(_count: number, global: boolean = false): Observable<Replies.Empty> {
        if (!this.ch) {
            return Observable.throw(new Error('Create channel before setting prefetch'));
        }

        const count = (_count === null || isNaN(_count)) ? this._connectionManager.getDefaultPrefetch() : _count;

        this._prefetch = count;
        this._global = global;
        return Observable.fromPromise(this.ch.prefetch(count, global));
    }

    public setChannel(ch): ChannelManager {
        this.ch = ch;
        return this;
    }

    public getChannel(): ChannelInterface {
        debug('get channel', this._key);
        return this.ch;
    }

    public isConnected(): boolean {
        return this._isConnected;
    }

    private defaultErrorHandler(err, origin) {
        this._isConnected = false;
        if (!this._reconnecting && origin === 'error' && err && err.code !== 404 && this.canCreateChannel()) {
          this._reconnecting = true;
          debug(`recreating channel after ${origin} event`, { err });
          this.create()
            .do(() => this.emit('reconnected'))
            .catch(_err => {
              debug(`could not recreate channel after ${origin} event`, { err: _err });
              this.emit('error', _err);
              return Observable.of(null);
            })
            .do(() => {
              this._reconnecting = false;
            }).subscribe();
        } else {
          debug(`Channel ${origin} ${(err && [':', err.message].join(' ')) || ''}`, { err });
        }
      }
}

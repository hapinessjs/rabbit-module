import { EventEmitter } from 'events';
import { Observable } from 'rxjs';
import * as querystring from 'querystring';
import { Channel as ChannelInterface, Connection, connect } from 'amqplib';
import { RabbitMQConfigConnection } from '../interfaces';
import { events } from '../events';
import { ChannelStore } from './channel-store';
import { ChannelManager } from './channel-manager';

const debug = require('debug')('hapiness:rabbitmq');

export class ConnectionManager extends EventEmitter {
    private _connection: Connection;
    private _isConnecting: boolean;
    private _isConnected: boolean;
    private _defaultChannel: ChannelManager;
    private _options: RabbitMQConfigConnection;
    private _uri: string;
    private _connect: typeof connect;
    private _defaultPrefetch: number;
    private _channelStore: ChannelStore;
    private _closingServer: boolean;

    constructor(config?: RabbitMQConfigConnection) {
        super();
        events.connection = this;
        this._connect = connect;
        this._connection = null;
        this._isConnecting = false;
        this._isConnected = false;
        this._closingServer = false;
        this._options = Object.assign({}, config);
        this._options.retry = Object.assign({ delay: 5000, maximum_attempts: -1 }, this._options.retry);

        if (this._options.retry.maximum_attempts === -1) {
            this._options.retry.maximum_attempts = Infinity;
        }

        if (this._options.uri) {
            this._uri = this._options.uri;
        } else {
            const port = this._options.port || 5672;
            const host = this._options.host || 'localhost';
            const vhost = this._options.vhost ? `/${this._options.vhost.replace(/^\//, '%2F')}` : '';
            const credentials = this._options.login && this._options.password ? `${this._options.login}:${this._options.password}@` : '';
            const params = this._options.params ? `?${querystring.stringify(this._options.params)}` : '';
            this._uri = `amqp://${credentials}${host}:${port}${vhost}${params}`;
        }

        // Will block new connection if SIGTERM is received
        /* istanbul ignore next */
        process.once('SIGTERM', () => this._closingServer = true);
        /* istanbul ignore next */
        process.once('SIGINT', () => this._closingServer = true);

        this.setDefaultPrefetch(this._options.default_prefetch);

        // Create a channel store for this connection
        this._channelStore = new ChannelStore(this);
    }

    setDefaultPrefetch(prefetch: number): ConnectionManager {
        if (prefetch === null || isNaN(prefetch) || prefetch < 0) {
            this._defaultPrefetch = 10;
        } else {
            this._defaultPrefetch = prefetch;
        }

        return this;
    }

    getDefaultPrefetch(): number {
        return this._defaultPrefetch;
    }

    emitEvent(name: string, ...args) {
        this.emit(name, ...args);
    }

    isConnecting(): boolean {
        return this._isConnecting;
    }

    isConnected(): boolean {
        return this._isConnected;
    }

    openConnection(): Observable<Connection> {
        return Observable.of(null)
            .flatMap(() => {
                debug('try to open connection ...');
                debug(`Retry delay: ${this._options.retry.delay}`);
                return Observable.fromPromise(this._connect(this._uri));
            })
            .retryWhen(errors => {
                errors.forEach(err => debug(err.message, err.stack));
                return errors
                    .scan(attempts => attempts + 1, 0)
                    .delay(this._options.retry.delay)
                    .takeWhile((attempts) => attempts < this._options.retry.maximum_attempts && !this._closingServer)
                    .take(this._options.retry.maximum_attempts)
                    .concat(Observable.throw(new Error('Retry limit exceeded')))
            });
    }

    connect(): Observable<Connection> {
        if (this.isConnecting()) {
            return Observable.of(null);
        }


        this._closingServer = false;
        this._isConnecting = true;

        debug('Connecting', this._uri);

        this.emitEvent('connecting');
        const obs = this.openConnection();
        return obs
            .flatMap(con => {
                debug('connected, creating default channel ...');
                this._connection = con;
                const createChannelObs = this.channelStore.create('default');
                this._handleDisconnection();
                this.emitEvent('opened', { connection: con });
                return createChannelObs;
            })
            .map(ch => {
                this._isConnected = true;
                this._isConnecting = false;
                this._defaultChannel = ch;
                debug('... channel created, RabbitMQ ready');
                this.emitEvent('connected');
                this.emitEvent('ready');
                return this._connection;
            });
    }

    close(): Observable<void> {
        this._isConnected = false;
        this._closingServer = true;
        return Observable.fromPromise(this._connection.close());
    }

    private _handleDisconnection(): void {
        this._connection.on('error', err => {
            debug('rabbitmq connection error', err);
            this._isConnected = false;
            this._isConnecting = false;
            this.emitEvent('error', err);
        });
    }

    get connection(): Connection {
        return this._connection;
    }

    get defaultChannel(): ChannelInterface {
        return this._defaultChannel.getChannel();
    }

    get defaultChannelManager(): ChannelManager {
        return this._defaultChannel;
    }

    get uri(): string {
        return this._uri;
    }

    get channelStore(): ChannelStore {
        return this._channelStore;
    }
}

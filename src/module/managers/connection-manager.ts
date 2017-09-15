import { Observable } from 'rxjs';
import * as querystring from 'querystring';
import { ChannelManager } from './channel-manager';
import { Channel as ChannelInterface, Connection, connect } from 'amqplib';
import * as EventEmitter from 'events';
import { RabbitMQConfigConnection } from '../interfaces';

export const REGEX_URI = /^amqp:\/\/([^@\n]+:[^@\n]+@)?(\w+)(:?)(\d{0,6})(\/[\w%]+)?(\?(?:&?[^=&\s]*=[^=&\s]*)+)?$/;

const debug = require('debug')('hapiness:rabbitmq');

export class ConnectionManager extends EventEmitter {
    private _connection: Connection;
    private _isConnecting: boolean;
    private _isConnected: boolean;
    private _defaultChannel: ChannelInterface;
    private _options: RabbitMQConfigConnection;
    private _uri: string;
    private _connect: typeof connect;

    constructor(config?: RabbitMQConfigConnection) {
        super();
        this._connect = connect;
        this._connection = null;
        this._isConnecting = false;
        this._isConnected = false;
        this._options = Object.assign({}, config);
        this._options.retry = Object.assign({ delay: 5000, maximum_attempts: -1 }, this._options.retry);

        if (this._options.retry.maximum_attempts === -1) {
            this._options.retry.maximum_attempts = Infinity;
        }

        if (this._options.uri) {
            if (!this._options.uri.match(REGEX_URI)) {
                throw new Error('Invalid uri');
            }

            this._uri = this._options.uri;
        } else {
            const port = this._options.port || 5672;
            const host = this._options.host || 'localhost';
            const vhost = this._options.vhost ? `/${this._options.vhost.replace(/^\//, '%2F')}` : '';
            const credentials = this._options.login && this._options.password ? `${this._options.login}:${this._options.password}@` : '';
            const params = this._options.params ? `?${querystring.stringify(this._options.params)}` : '';
            this._uri = `amqp://${credentials}${host}:${port}${vhost}${params}`;
        }
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
                return Observable.fromPromise(this._connect(this._uri));
            })
            .retryWhen(errors =>
                errors
                    .delay(this._options.retry.delay)
                    .take(this._options.retry.maximum_attempts)
                    .concat(Observable.throw(new Error('Retry limit exceeded')))
            );
    }

    connect(): Observable<Connection> {
        if (this.isConnecting()) {
            return Observable.of(null);
        }

        this._isConnecting = true;

        debug('Connecting', this._uri);

        this.emit('connecting');
        const obs = this.openConnection();
        return obs
            .flatMap(con => {
                this._connection = con;
                this._handleDisconnection();
                debug('connected, creating default channel ...');
                this.emit('opened', { connection: con });
                const channel = new ChannelManager(this._connection);
                return channel.create();
            })
            .map(ch => {
                this._isConnected = true;
                this._isConnecting = false;
                this._defaultChannel = ch;
                debug('... channel created, RabbitMQ ready');
                this.emit('connected');
                this.emit('ready');
                return this._connection;
            });
    }

    private _handleDisconnection(): void {
        this._connection.on('error', err => {
            this._isConnected = false;
            this._isConnecting = false;
            this.emit('error', err);
        });
    }

    get connection(): Connection {
        return this._connection;
    }

    get defaultChannel(): ChannelInterface {
        return this._defaultChannel;
    }

    get uri(): string {
        return this._uri;
    }
}

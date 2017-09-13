import { Observable } from 'rxjs';
import * as querystring from 'querystring';
import { ChannelManager } from './index';
import { Channel as ChannelInterface, Connection as ConnectionInterface, connect } from 'amqplib';
import * as EventEmitter from 'events';
import { RabbitMQConfigConnection } from '../interfaces/index';

export const REGEX_URI = /^amqp:\/\/([^@\n]+:[^@\n]+@)?(\w+)(:?)(\d{0,6})(\/[\w%]+)?(\?(?:&?[^=&\s]*=[^=&\s]*)+)?$/;

const debug = require('debug')('hapiness:rabbitmq');

export class ConnectionManager extends EventEmitter {
    private connection: ConnectionInterface;
    private _isConnecting: boolean;
    private _isConnected: boolean;
    private defaultChannel: ChannelInterface;
    private _options: RabbitMQConfigConnection;
    private uri: string;
    private safeUri: string;
    private _connect: typeof connect;
    private _connectionOpen: boolean;

    constructor(config?: RabbitMQConfigConnection) {
        super();
        this._connect = connect;
        this.connection = null;
        this._isConnecting = false;
        this._isConnected = false;
        this._connectionOpen = false;
        this._options = Object.assign({}, config);
        this._options.retry = Object.assign({ delay: 5000, maximum_attempts: Infinity }, this._options.retry);

        if (this._options.retry.maximum_attempts === -1) {
            this._options.retry.maximum_attempts = Infinity;
        }

        if (this._options.uri) {
            if (!this._options.uri.match(REGEX_URI)) {
                throw new Error('Invalid uri');
            }

            this.uri = this._options.uri;
            this.safeUri = this.uri.replace(/\/\/(.+)@/, '');
        } else {
            const port = this._options.port || 5672;
            const host = this._options.host || 'localhost';
            const vhost = this._options.vhost ? `/${this._options.vhost.replace(/^\//, '%2F')}` : '';
            const credentials = this._options.login && this._options.password ? `${this._options.login}:${this._options.password}@` : '';
            const params = this._options.params ? `?${querystring.stringify(this._options.params)}` : '';
            this.uri = `amqp://${credentials}${host}:${port}${vhost}${params}`;
            this.safeUri = `amqp://${credentials ? 'xxx@' : ''}${host}:${port}${vhost}${params}`;
        }
    }

    isConnecting() {
        return this._isConnecting;
    }

    isConnected() {
        return this._isConnected;
    }

    openConnection() {
        return Observable.of(null)
            .flatMap(() => {
                debug('try to open connection ...');
                return Observable.fromPromise(this._connect(this.uri));
            })
            .do(_ => {
                this._connectionOpen = true;
            })
            .retryWhen(errors =>
                errors
                    .delay(this._options.retry.delay)
                    .take(this._options.retry.maximum_attempts)
                    .concat(Observable.throw(new Error('Retry limit exceeded')))
            );
    }

    connect(): Observable<ConnectionInterface> {
        if (this.isConnecting()) {
            return Observable.of(null);
        }

        this._isConnecting = true;

        debug('Connecting', this.safeUri);

        this.emit('connecting');
        const obs = this.openConnection();
        return obs
            .flatMap(con => {
                this.connection = con;
                this._handleDisconnection();
                debug('connected, creating default channel ...');
                this.emit('opened', { connection: con });
                const channel = new ChannelManager(this.connection);
                return channel.create();
            })
            .map(ch => {
                this._isConnected = true;
                this._isConnecting = false;
                this.defaultChannel = ch;
                debug('... channel created, RabbitMQ ready');
                this.emit('connected');
                this.emit('ready');
                return this.connection;
            });
    }

    _handleDisconnection() {
        this.connection.on('error', err => {
            this._isConnected = false;
            this._connectionOpen = false;
            this._isConnecting = false;
            this.emit('error', err);
        });
    }

    getConnection() {
        return this.connection;
    }

    getDefaultChannel() {
        return this.defaultChannel;
    }
}

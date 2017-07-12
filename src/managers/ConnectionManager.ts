import { Observable } from 'rxjs';
import { ChannelManager } from './ChannelManager';
import { Channel as ChannelInterface, Connection as ConnectionInterface, connect } from 'amqplib';
import * as EventEmitter from 'events';
import { Injectable } from "@hapiness/core";

export const REGEX_URI = /^amqp:\/\/([^@\n]+:[^@\n]+@)?(\w+)(:?)(\d{0,6})(\/[\w%]+)?$/;

const debug = require('debug')('hapiness:rabbitmq');

export interface ConnectOptions {
    host?: string;
    port?: number;
    login?: string;
    password?: string;
    vhost?: string;
    uri?: string;
};

export class ConnectionManager extends EventEmitter {

    private connection: ConnectionInterface;
    private _isConnecting: boolean;
    private _isConnected: boolean;
    private defaultChannel: ChannelInterface;
    private _options;
    private uri: string;
    private safeUri: string;
    private _connect: typeof connect;

    constructor(options: ConnectOptions = {}) {
        super();
        this._connect = connect;
        this.connection = null;
        this._isConnecting = false;
        this._isConnected = false;
        this._options = Object.assign({
            connection: { reconnect: true, reconnect_interval: 2000 }
        }, options);

        if (options.uri) {
            if (!options.uri.match(REGEX_URI)) {
                throw new Error('Invalid uri');
            }

            this.uri = options.uri;
            this.safeUri = this.uri.replace(/\/\/(.+)@/, '');
        } else {
            const port = options.port || 5672;
            const host = options.host || 'localhost';
            const vhost = (options.vhost || '').replace(/^\//, '%2F');
            const credentials = (options.login && options.password) ?
            `${options.login}:${options.password}@` : '';

            this.uri = `amqp://${credentials}${host}:${port}/${vhost}`;
            this.safeUri = `amqp://${credentials ? 'xxx@' : '' }${host}:${port}/${vhost}`;
        }
    }

    isConnecting() {
        return this._isConnecting;
    }

    isConnected() {
        return this._isConnected;
    }

    connect(): Observable<ConnectionInterface> {
        return this
            .tryConnect();
            // .retryWhen(errors => { console.log('NOPE'); return errors.delay(1); })
            // .take(1);
    }

    tryConnect(): Observable<ConnectionInterface> {
        if (this.isConnecting()) {
            return Observable.of(null);
        }

        this._isConnecting = true;

        debug('Connecting', this.safeUri);

        this.emit('connecting');
        const obs = Observable.fromPromise(this._connect(this.uri));
        return obs
            .flatMap(con => {
                this.connection = con;
                debug('connected, creating default channel ...')
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

    private _reconnect(err?: any): Observable<ConnectionInterface> {
        debug('reconnecting', err);
        this.emit('reconnect', err);

        if (!this._options.connection.reconnect) {
            return Observable.throw(err);
        }

        return Observable
            .of(null)
            .delay(500)
            .delay(this._options.connection.reconnect_interval);
    }

    getConnection() {
        return this.connection;
    }

    getDefaultChannel() {
        return this.defaultChannel;
    }

}

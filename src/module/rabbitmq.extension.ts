import {
    CoreModule,
    OnExtensionLoad,
    OnModuleInstantiated,
    ExtensionWithConfig,
    Extension,
    errorHandler,
    ExtensionShutdownPriority,
    OnShutdown
 } from '@hapiness/core';
import { Observable } from 'rxjs';
import { EventEmitter } from 'events';

import { ConnectionManager } from './managers';
import { RabbitMQConfig } from './interfaces/config';

import { MessageStore } from './managers/message-store';

import { RegisterAnnotations } from './extension/register-annotations';
import { DefaultMessageRouter } from './message-router';

const debug = require('debug')('hapiness:rabbitmq');

export class RabbitMQExt extends EventEmitter implements OnExtensionLoad, OnModuleInstantiated, OnShutdown {
    static ConnectionManager: typeof ConnectionManager = ConnectionManager;
    static MessageRouter = DefaultMessageRouter;
    private static config: RabbitMQConfig;

    public static setConnectionManager(_ConnectionManager: typeof ConnectionManager) {
        this.ConnectionManager = _ConnectionManager;
        return this;
    }

    public static setMessageRouter(_MessageRouter) {
        this.MessageRouter = _MessageRouter;
        return this;
    }

    public static setConfig(config: RabbitMQConfig): ExtensionWithConfig {
        RabbitMQExt.config = { check: false, assert: true, ...config };
        return {
            token: RabbitMQExt,
            config
        };
    }

    public static getConfig(): RabbitMQConfig {
        return RabbitMQExt.config;
    }

    /**
     * Connect to RabbitMQ
     *
     * @param  {CoreModule} module
     * @param  config
     * @returns Observable
     */
    onExtensionLoad(module: CoreModule, config: RabbitMQConfig): Observable<Extension> {
        const connection = new RabbitMQExt.ConnectionManager(config.connection);
        debug('Extension connecting to rabbitmq');

        return connection.connect().flatMap(_ => {
            return Observable.of({
                instance: this,
                token: RabbitMQExt,
                value: connection
            });
        });
    }

    /**
     *
     * @param  {CoreModule} module
     * @param  {Server} server
     * @returns Observable
     */
    onModuleInstantiated(module: CoreModule, connection: ConnectionManager): Observable<any> {
        debug('bootstrapping module: asserting exchanges, queues, binds, messages routing');

        // Try to reconnect and launch bootstrap when we have an error
        connection.once('error', () => {
            debug('connection.once#error: try to reconnect');
            connection.connect()
            // When we are connected we need to launch the bootstrap sequence
                .do(() =>
                    this.onModuleInstantiated(module, connection).subscribe(() => {}, () => {}))
                .subscribe(() => {}, err => {
                    errorHandler(err);
                    const connectionError: any = new Error('Connection error');
                    connectionError.source = err;
                    connectionError.key = 'HAPINESS_RABBITMQ_CONNECTION_ERROR';
                    connection.emit('error', connectionError);
                });
        });

        return RegisterAnnotations
            .bootstrap(module, connection, RabbitMQExt.MessageRouter)
            .catch(err => {
                errorHandler(err);
                const bootstrapError: any = new Error('Bootstrap error');
                bootstrapError.source = err;
                bootstrapError.key = 'HAPINESS_RABBITMQ_BOOTSTRAP_ERROR';
                this.emit('error', bootstrapError);
                return Observable.throw(bootstrapError);
            });
    }

    onShutdown(module, connection: ConnectionManager) {
        debug('kill received, starting shutdown procedure');
        const exitObservable = MessageStore
            .shutdown(connection)
            .do(() => {
                debug('bye');
            });

        return {
            priority: ExtensionShutdownPriority.IMPORTANT,
            resolver: exitObservable
        };
    }
}

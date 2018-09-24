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

import { ConnectionManager } from './managers';
import { RabbitMQConfig } from './interfaces/config';

import { MessageStore } from './managers/message-store';

import { RegisterAnnotations } from './extension/register-annotations';
import { DefaultMessageRouter } from './message-router';

const debug = require('debug')('hapiness:rabbitmq');

export class RabbitMQExt implements OnExtensionLoad, OnModuleInstantiated, OnShutdown {
    static ConnectionManager: typeof ConnectionManager = ConnectionManager;
    static MessageRouter = DefaultMessageRouter;

    public static setConnectionManager(_ConnectionManager: typeof ConnectionManager) {
        this.ConnectionManager = _ConnectionManager;
        return this;
    }

    public static setMessageRouter(_MessageRouter) {
        this.MessageRouter = _MessageRouter;
        return this;
    }

    public static setConfig(config: RabbitMQConfig): ExtensionWithConfig {
        return {
            token: RabbitMQExt,
            config
        };
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
            connection
                .connect()
                .do(() => this.onModuleInstantiated(module, connection))
                .subscribe(() => {}, err => {
                    errorHandler(err);
                });
        });

        return RegisterAnnotations.bootstrap(module, connection, RabbitMQExt.MessageRouter);
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

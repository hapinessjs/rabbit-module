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

const debug = require('debug')('hapiness:rabbitmq');

export class RabbitMQExt implements OnExtensionLoad, OnModuleInstantiated, OnShutdown {
    static ConnectionManager: typeof ConnectionManager;

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
        connection.on('error', () => {
            connection
                .connect()
                .flatMap(() => {
                    return RegisterAnnotations.bootstrap(module, connection);
                })
                .subscribe(_ => {}, err => errorHandler(err));
        });

        return RegisterAnnotations.bootstrap(module, connection);
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

RabbitMQExt.ConnectionManager = ConnectionManager;

import { RegisterAnnotations } from './register-annotations';


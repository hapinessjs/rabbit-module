import { CoreModule, OnExtensionLoad, OnModuleInstantiated, ExtensionWithConfig, Extension } from '@hapiness/core';
import { InitExtension } from './InitExtension';
import { Observable } from 'rxjs';

import { ConnectionManager } from './managers';
import { RabbitMQConfig } from './interfaces/config';

const debug = require('debug')('hapiness:rabbitmq');

export class RabbitMQExt implements OnExtensionLoad, OnModuleInstantiated {
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
        return InitExtension.bootstrap(module, connection);
    }
}

RabbitMQExt.ConnectionManager = ConnectionManager;

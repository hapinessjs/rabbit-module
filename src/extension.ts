import { CoreModule, OnExtensionLoad, OnModuleInstantiated, ExtensionWithConfig, Extension } from '@hapiness/core';
import { InitExtension } from './InitExtension';
import { Observable } from 'rxjs';

import { ConnectionManager } from './managers/ConnectionManager';
import { sendMessage } from './Message';

const debug = require('debug')('hapiness:rabbitmq');

export class RabbitMQExt implements OnExtensionLoad {

    public static setConfig(config): ExtensionWithConfig {
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
    onExtensionLoad(module: CoreModule, config): Observable<Extension> {
        const connection = new ConnectionManager(config);
        return connection.connect()
            .flatMap(_ => Observable.of({
                instance: this,
                token: RabbitMQExt,
                value: connection
            }));
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

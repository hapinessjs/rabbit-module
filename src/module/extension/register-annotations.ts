import { Observable } from 'rxjs';
import { CoreModule, Type } from '@hapiness/core';
import { ConnectionManager } from '../managers';
import { getModules } from '../utils';
import buildExchanges from './build-exchange';
import buildQueues from './build-queues';
import { MessageRouterInterface } from '../interfaces/message-router';

const debug = require('debug')('hapiness:rabbitmq');

export class RegisterAnnotations {
    public static bootstrap(module: CoreModule, connection: ConnectionManager, MessageRouter: Type<MessageRouterInterface>) {
        debug('bootstrap extension');
        const modules = getModules(module);
        return buildExchanges(modules, connection)
            .toArray()
            .flatMap(_ => buildQueues(modules, connection, MessageRouter))
            .toArray()
            .flatMap(_ => {
                return Observable.of(null);
            });
    }
}

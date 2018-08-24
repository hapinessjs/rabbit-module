import { QueueManager } from '../managers/queue-manager';
import { Observable } from 'rxjs/Observable';
import { errorHandler } from '@hapiness/core';
import { MessageRouterInterface } from '../interfaces/message-router';

const debug = require('debug')('hapiness:rabbitmq');

export function consumeQueue(queue: QueueManager, messageRouter: MessageRouterInterface): Observable<any> {
    debug(`Creating dispatcher for queue ${queue.getName()}`);
    return queue.consume(
        (ch, message) => messageRouter.getDispatcher(ch, message))
        .catch(err => Observable.of(errorHandler(err)))
        .do(() => debug('consumed'));
}

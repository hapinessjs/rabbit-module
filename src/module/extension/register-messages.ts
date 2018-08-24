import { CoreModule, extractMetadataByDecorator } from '@hapiness/core';
import { Observable } from 'rxjs/Observable';
import { QueueManager } from '../managers/queue-manager';
import { metadataFromDeclarations } from '../utils';
import { MessageDecoratorInterface, ExchangeDecoratorInterface } from '../decorators';
import { MessageRouterInterface } from '../interfaces/message-router';

const debug = require('debug')('hapiness:rabbitmq');

export default function registerMessages(modules: CoreModule[], queue: QueueManager, messageRouter: MessageRouterInterface) {
    debug('register messages');
    return Observable.from(modules)
        .flatMap(_module => metadataFromDeclarations<MessageDecoratorInterface>(_module.declarations, 'Message')
            .filter(metadata => {
                const { name } = extractMetadataByDecorator<ExchangeDecoratorInterface>(metadata.data.queue, 'Queue');
                debug('filtering message for queue', name, queue.getName());
                return name === queue.getName();
            })
            .flatMap(_ => messageRouter.registerMessage({ token: _.token, module: _module, data: _.data }))
        );
}

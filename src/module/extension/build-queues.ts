import { CoreModule, DependencyInjection, extractMetadataByDecorator, Type } from '@hapiness/core';
import { ConnectionManager } from '../managers/connection-manager';
import { Observable } from 'rxjs/Observable';
import { metadataFromDeclarations } from '../utils';
import { QueueDecoratorInterface, ExchangeDecoratorInterface } from '../decorators';
import { getChannel } from './get-channel';
import { QueueManager } from '../managers/queue-manager';
import { QueueWrapper } from '../managers/queue-wrapper';
import registerMessages from './register-messages';
import { MessageRouterInterface } from '../interfaces/message-router';
import { consumeQueue } from './consume-queue';
import { RabbitMQExt } from '../rabbitmq.extension';

export default function buildQueues(
    modules: CoreModule[], connection: ConnectionManager, MessageRouter: Type<MessageRouterInterface>
): Observable<any> {
    return Observable.from(modules)
        .filter(_module => !!_module)
        .flatMap(_module =>
            metadataFromDeclarations<QueueDecoratorInterface>(_module.declarations, 'Queue')
                .map(metadata => ({ metadata, _module }))
        )
        .flatMap(({ metadata, _module }) =>
            DependencyInjection.instantiateComponent(metadata.token, _module.di)
                .map(instance => ({ instance, _module, metadata})))
        // Assert queue
        .flatMap(({ instance, _module, metadata }) =>
            metadata.data.channel ?
                    getChannel(connection, metadata.data.channel)
                    .map(channel => ({ instance, metadata, channel, _module })) :
                Observable.of({ instance, metadata, channel: connection.defaultChannelManager, _module }))
        .flatMap(({ instance, metadata, channel, _module }) => {
            const queue = new QueueManager(channel, new QueueWrapper(instance, metadata.data));
            const shouldAssert = typeof metadata.data.assert === 'boolean' ? metadata.data.assert : RabbitMQExt.getConfig().assert;
            // Don't check queue if we assert it
            const assertOrCheck$ = shouldAssert
                ? queue.assert().map(() => queue)
                : metadata.data.check ? queue.check().map(() => queue) : Observable.of(queue);
            return Observable
                .forkJoin(assertOrCheck$, Observable.of(metadata), Observable.of(_module));
        })
        // Bind queue
        .flatMap(([queue, metadata, _module]) => {
            if (Array.isArray(metadata.data.binds)) {
                return Observable.forkJoin(
                    metadata.data.binds.map(bind => {
                        if (Array.isArray(bind.pattern)) {
                            return Observable.forkJoin(bind.pattern.map(pattern => queue.bind(
                                extractMetadataByDecorator<ExchangeDecoratorInterface>(bind.exchange, 'Exchange').name, pattern)));
                        }

                        return queue.bind(
                            extractMetadataByDecorator<ExchangeDecoratorInterface>(bind.exchange, 'Exchange').name, bind.pattern
                        );
                    })).map(() => ({ queue, _module }));
            }

            return Observable.of(({ queue, _module }));
        })
        // Register messages related to queue
        // Consume queue
        // Dont consume queue if there are no messages or consume() method on queue
        .flatMap(({ queue, _module }) => {
            const messageRouter = new MessageRouter();
            return registerMessages(modules, queue, messageRouter)
                .defaultIfEmpty(null)
                .filter(item => !!item)
                .toArray()
                .switchMap((registeredMessages) => {
                    const _queue = queue.getQueue();
                    if (registeredMessages.length || typeof _queue['onMessage'] === 'function') {
                        return consumeQueue(queue, messageRouter);
                    }

                    return Observable.of(null);
                });
        })
        .toArray();
}

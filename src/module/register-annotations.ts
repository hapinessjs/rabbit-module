import { Observable } from 'rxjs';
import { Channel as ChannelInterface } from 'amqplib';
import { Type, CoreModule, extractMetadataByDecorator, errorHandler, DependencyInjection } from '@hapiness/core';
import { ConnectionManager } from './managers';
import { QueueDecoratorInterface, ExchangeDecoratorInterface, MessageDecoratorInterface, ChannelOptions } from './decorators';
import { QueueManager } from './managers';
import { ExchangeManager, ExchangeWrapper, QueueWrapper } from './managers';
import { MessageRouter } from './message-router';
import { MessageInterface } from './interfaces';
import { getModules } from './utils';

const debug = require('debug')('hapiness:rabbitmq');

export class RegisterAnnotations {
    public static bootstrap(module: CoreModule, connection: ConnectionManager) {
        debug('bootstrap extension');
        const modules = getModules(module);
        return RegisterAnnotations.buildExchanges(modules, connection)
            .toArray()
            .flatMap(_ => RegisterAnnotations.buildQueues(modules, connection))
            .toArray()
            .flatMap(_ => {
                return Observable.of(null);
            });
    }

    public static getChannel(module: CoreModule, connection: ConnectionManager, channel: ChannelOptions): Observable<ChannelInterface> {
        return connection
            .channelStore
            .upsert(channel.key, { prefetch: channel.prefetch, global: channel.global })
            .map(ch => ch.getChannel());
    }

    public static buildExchanges(modules: CoreModule[], connection: ConnectionManager): Observable<any> {
        return Observable.from(modules)
            .filter(_module => !!_module)
            .flatMap(_module =>
                RegisterAnnotations.metadataFromDeclarations<ExchangeDecoratorInterface>(_module.declarations, 'Exchange')
                    .map(metadata => ({ metadata, _module }))
            )
            .flatMap(({ metadata, _module }) => DependencyInjection.instantiateComponent(metadata.token, _module.di)
                .map(instance => ({ instance, _module, metadata })))
            .flatMap(({ instance, _module, metadata }) => {
                const exchange = new ExchangeManager(connection.defaultChannel, new ExchangeWrapper(instance, metadata.data));
                return exchange.assert();
            })
            .toArray();
    }

    public static buildQueues(modules: CoreModule[], connection: ConnectionManager): Observable<any> {
        return (
            Observable.from(modules)
                .filter(_module => !!_module)
                .flatMap(_module =>
                    RegisterAnnotations.metadataFromDeclarations<QueueDecoratorInterface>(_module.declarations, 'Queue')
                        .map(metadata => ({ metadata, _module }))
                )
                .flatMap(({ metadata, _module }) =>
                    DependencyInjection.instantiateComponent(metadata.token, _module.di)
                        .map(instance => ({ instance, _module, metadata})))
                // Assert queue
                .mergeMap(({ instance, _module, metadata }) =>
                    metadata.data.channel ?
                        RegisterAnnotations
                            .getChannel(_module, connection, metadata.data.channel)
                            .map(channel => ({ instance, metadata, channel, _module })) :
                        Observable.of({ instance, metadata, channel: connection.defaultChannel, _module }))
                .mergeMap(({ instance, metadata, channel, _module }) => {
                    const queue = new QueueManager(channel, new QueueWrapper(instance, metadata.data));
                    return Observable.forkJoin(queue.assert(), Observable.of(metadata), Observable.of(_module));
                })
                // Bind queue
                .mergeMap(([queue, metadata, _module]) => {
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
                .mergeMap(({ queue, _module }) => {
                    const messageRouter = new MessageRouter();
                    return RegisterAnnotations.registerMessages(modules, queue, messageRouter)
                        .defaultIfEmpty(null)
                        .filter(item => !!item)
                        .toArray()
                        .switchMap((registeredMessages) => {
                            const _queue = queue.getQueue();
                            if (registeredMessages.length || typeof _queue['onMessage'] === 'function') {
                                return RegisterAnnotations.consumeQueue(queue, messageRouter);
                            }

                            return Observable.of(null);
                        });
                })
                .toArray()
        );
    }

    static consumeQueue(queue: QueueManager, messageRouter: MessageRouter): Observable<any> {
        debug(`Creating dispatcher for queue ${queue.getName()}`);
        return queue.consume(
            (ch, message) => messageRouter.getDispatcher(ch, message))
            .catch(err => Observable.of(errorHandler(err)))
            .do(() => debug('consumed'));
    }

    public static registerMessages(modules: CoreModule[], queue: QueueManager, messageRouter: MessageRouter) {
        debug('register messages');
        return Observable.from(modules)
            .flatMap(_module => RegisterAnnotations.metadataFromDeclarations<MessageDecoratorInterface>(_module.declarations, 'Message')
            .filter(metadata => {
                const { name } = extractMetadataByDecorator<ExchangeDecoratorInterface>(metadata.data.queue, 'Queue');
                debug('filtering message for queue', name, queue.getName());
                return name === queue.getName();
            })
            .flatMap(_ => DependencyInjection.instantiateComponent(_.token, _module.di).map(instance => ({ instance, _ })))
            .map(({ instance, _ }) => {
                return messageRouter.registerMessage(<MessageInterface>instance);
            }));
    }

    /**
     * Extract metadata filtered by queue
     * from the declarations provided
     *
     * @param  {Type<any>} declarations
     * @returns Array<QueueDecorator>
     */
    public static metadataFromDeclarations<T>(declarations: Type<any>[], decoratorName) {
        return Observable.from([].concat(declarations))
            .filter(_ => !!_ && !!extractMetadataByDecorator(_, decoratorName))
            .map(_ => ({
                token: _,
                data: extractMetadataByDecorator<T>(_, decoratorName)
            }));
    }
}

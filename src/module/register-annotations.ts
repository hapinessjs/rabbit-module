import { Observable } from 'rxjs';
import { extractMetadataByDecorator } from '@hapiness/core/core/metadata';
import { Type, CoreModule } from '@hapiness/core';
import { errorHandler } from '@hapiness/core/core';
import { DependencyInjection } from '@hapiness/core/core/di';
import { Channel as ChannelInterface } from 'amqplib';
import { ConnectionManager } from './managers';
import { QueueDecoratorInterface, ExchangeDecoratorInterface, MessageDecoratorInterface } from './decorators';
import { QueueManager } from './managers';
import { ExchangeManager, ExchangeWrapper, QueueWrapper } from './managers';
import { MessageRouter } from './message-router';
import { MessageInterface } from './interfaces';
import { ChannelService } from './services/channel.service';

const debug = require('debug')('hapiness:rabbitmq');

export class RegisterAnnotations {
    public static bootstrap(module: CoreModule, connection: ConnectionManager) {
        debug('bootstrap extension');
        return this.buildExchanges(module, connection)
            .toArray()
            .flatMap(_ => this.buildQueues(module, connection))
            .toArray()
            .flatMap(_ => {
                return Observable.of(null);
            });
    }

    public static getChannel(module: CoreModule, connection, key): Observable<ChannelInterface> {
        return DependencyInjection.instantiateComponent(ChannelService, module.di)
            .switchMap(channelService => channelService.upsert(key).map(channelManager => channelManager.getChannel()));
    }

    public static buildExchanges(module, connection: ConnectionManager): Observable<any> {
        return Observable.of(module)
            .filter(_ => !!_)
            .flatMap(_ => RegisterAnnotations.metadataFromDeclarations<ExchangeDecoratorInterface>(_.declarations, 'Exchange'))
            .flatMap(_ => DependencyInjection.instantiateComponent(_.token, module.di).map(instance => ({ instance, _ })))
            .flatMap(({ instance, _ }) => {
                const exchange = new ExchangeManager(connection.defaultChannel, new ExchangeWrapper(instance, _.data));
                return exchange.assert();
            });
    }

    public static buildQueues(module, connection: ConnectionManager): Observable<any> {
        return (
            Observable.of(module)
                .filter(_ => !!_)
                .flatMap(_ => RegisterAnnotations.metadataFromDeclarations<QueueDecoratorInterface>(_.declarations, 'Queue'))
                .flatMap(_ => DependencyInjection.instantiateComponent(_.token, module.di).map(instance => ({ instance, _ })))
                // Assert queue
                .mergeMap(({ instance, _ }) =>
                    _.data.channel ?
                        RegisterAnnotations
                            .getChannel(module, connection, _.data.channel.key)
                            .map(channel => ({ instance, _, channel }))
                        : Observable.of({ instance, _, channel: connection.defaultChannel }))
                .mergeMap(({ instance, _, channel }) => {
                    const queue = new QueueManager(channel, new QueueWrapper(instance, _.data));
                    return Observable.forkJoin(queue.assert(), Observable.of(_));
                })
                // Bind queue
                .mergeMap(([queue, _]) => {
                    if (Array.isArray(_.data.binds)) {
                        return Observable.forkJoin(
                            _.data.binds.map(bind => {
                                if (Array.isArray(bind.pattern)) {
                                    return Observable.forkJoin(bind.pattern.map(pattern => queue.bind(
                                        extractMetadataByDecorator<ExchangeDecoratorInterface>(bind.exchange, 'Exchange').name,
                                    pattern)));
                                }

                                return queue.bind(
                                    extractMetadataByDecorator<ExchangeDecoratorInterface>(bind.exchange, 'Exchange').name,
                                    String(bind.pattern)
                                );
                            })).map(() => queue);
                        // )).map(() => queue);
                    }

                    return Observable.of(queue);
                })
                // Register messages related to queue
                // Consume queue
                .mergeMap(queue => {
                    const messageRouter = new MessageRouter();
                    return this.registerMessages(module, queue, messageRouter)
                        .defaultIfEmpty(null)
                        .toArray()
                        .map(() => this.consumeQueue(queue, messageRouter));
                })
        );
    }

    static consumeQueue(queue: QueueManager, messageRouter: MessageRouter) {
        debug(`Creating dispatcher for queue ${queue.getName()}`);
        queue.consume((ch, message) => messageRouter.getDispatcher(ch, message)).subscribe(() => {}, err => errorHandler(err));
    }

    public static registerMessages(module, queue: QueueManager, messageRouter: MessageRouter) {
        return RegisterAnnotations.metadataFromDeclarations<MessageDecoratorInterface>(module.declarations, 'Message')
            .filter(_ => {
                return extractMetadataByDecorator<ExchangeDecoratorInterface>(_.data.queue, 'Queue').name === queue.getName();
            })
            .flatMap(_ => DependencyInjection.instantiateComponent(_.token, module.di).map(instance => ({ instance, _ })))
            .map(({ instance, _ }) => {
                return messageRouter.registerMessage(<MessageInterface>instance);
            });
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

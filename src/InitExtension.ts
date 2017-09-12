import { Observable } from 'rxjs';
import { extractMetadataByDecorator } from '@hapiness/core/core/metadata';
import { Type } from '@hapiness/core';
import { DependencyInjection } from '@hapiness/core/core/di';
import { Channel as ChannelInterface } from 'amqplib';
import { ConnectionManager } from './managers';
import { QueueDecoratorInterface, ExchangeDecoratorInterface, MessageDecoratorInterface } from './decorators';
import { QueueManager } from './managers';
import { ExchangeManager, ExchangeWrapper, QueueWrapper } from './managers';
import { MessageRouter } from './MessageRouter';
import { RabbitMessage, MessageResult, MessageInterface } from './interfaces';
const debug = require('debug')('hapiness:rabbitmq');

export class InitExtension {
    public static bootstrap(module, connection: ConnectionManager) {
        debug('bootstrap extension');
        return this.buildExchanges(module, connection)
            .toArray()
            .flatMap(_ => this.buildQueues(module, connection))
            .toArray()
            .flatMap(_ => {
                return Observable.of(null);
            });
    }

    public static buildExchanges(module, connection: ConnectionManager): Observable<any> {
        return Observable.of(module)
            .filter(_ => !!_)
            .flatMap(_ => this.metadataFromDeclarations<ExchangeDecoratorInterface>(_.declarations, 'Exchange'))
            .flatMap(_ => DependencyInjection.instantiateComponent(_.token, module.di).map(instance => ({ instance, _ })))
            .flatMap(({ instance, _ }) => {
                const exchange = new ExchangeManager(connection.getDefaultChannel(), new ExchangeWrapper(instance, _.data));
                return exchange.assert();
            });
    }

    public static buildQueues(module, connection: ConnectionManager): Observable<any> {
        return (
            Observable.of(module)
                .filter(_ => !!_)
                .flatMap(_ => this.metadataFromDeclarations<QueueDecoratorInterface>(_.declarations, 'Queue'))
                .flatMap(_ => DependencyInjection.instantiateComponent(_.token, module.di).map(instance => ({ instance, _ })))
                // Assert queue
                .mergeMap(({ instance, _ }) => {
                    const queue = new QueueManager(connection.getDefaultChannel(), new QueueWrapper(instance, _.data));
                    return Observable.forkJoin(queue.assert(), Observable.of(_));
                })
                // Bind queue
                .mergeMap(([queue, _]) => {
                    if (Array.isArray(_.data.binds)) {
                        return Observable.forkJoin(
                            _.data.binds.map(bind => {
                                return queue.bind(
                                    extractMetadataByDecorator<ExchangeDecoratorInterface>(bind.exchange, 'Exchange').name,
                                    bind.pattern
                                );
                            })
                        ).map(() => queue);
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
                        .map(() => this._consumeQueue(queue, messageRouter));
                })
        );
    }

    private static _consumeQueue(queue: QueueManager, messageRouter: MessageRouter) {
        debug(`Creating dispatcher for queue ${queue.getName()}`);
        const messageDispatcher = (ch: ChannelInterface, message: RabbitMessage): Observable<MessageResult> => {
            return messageRouter.dispatch(ch, message).catch(err => {
                if (err.code === 'MESSAGE_CLASS_NOT_FOUND' && typeof queue['queue']['onMessage'] === 'function') {
                    return queue['queue']['onMessage'](message, ch);
                }

                return Observable.throw(err);
            });
        };
        queue.consume(messageDispatcher);
    }

    public static registerMessages(module, queue: QueueManager, messageRouter: MessageRouter) {
        return this.metadataFromDeclarations<MessageDecoratorInterface>(module.declarations, 'Message')
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
    private static metadataFromDeclarations<T>(declarations: Type<any>[], decoratorName) {
        return Observable.from([].concat(declarations))
            .filter(_ => !!_ && !!extractMetadataByDecorator(_, decoratorName))
            .map(_ => ({
                token: _,
                data: extractMetadataByDecorator<T>(_, decoratorName)
            }));
    }
}

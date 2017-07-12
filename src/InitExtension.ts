import * as R from 'ramda';
import { Observable } from 'rxjs';
import { extractMetadataByDecorator } from '@hapiness/core/core/metadata';
import { Type, CoreModule } from '@hapiness/core';
import { DependencyInjection } from '@hapiness/core/core/di';
import { Channel as ChannelInterface } from 'amqplib';
import { ConnectionManager } from './managers/ConnectionManager';
import { QueueDecoratorInterface, ExchangeDecoratorInterface, MessageDecoratorInterface } from './decorators';
import { QueueManager, QueueBase, GenericQueue } from './managers/QueueManager';
import { ExchangeManager, ExchangeBase, GenericExchange } from './managers/ExchangeManager';
import { MessageRouter } from './MessageRouter';
import { GenericMessage, RabbitMessage, MessageResult } from './Message';

interface InternalType {
    queue: QueueDecoratorInterface;
    token: Type<any>;
};

export class InitExtension {

    public static bootstrap(module, connection: ConnectionManager) {
        return this.buildExchanges(module, connection)
            .flatMap(_ => this.buildQueues(module, connection))
            .toArray()
            .flatMap(_ => {
                return Observable.of(null);
            });
    }

    public static buildExchanges(module, connection: ConnectionManager): Observable<any> {
        return Observable.of(module)
            .filter(_ => !!_)
            .flatMap(_ => this.metadataFromDeclarations<ExchangeDecoratorInterface, typeof GenericExchange>(_.declarations, 'Exchange'))
            .flatMap(_ => DependencyInjection.instantiateComponent<GenericExchange>(_.token, module.di).map(instance => ({ instance, _ })))
            .flatMap(({ instance, _ }) => {
                const exchange = new ExchangeManager<typeof instance>(connection.getDefaultChannel(), instance);
                return exchange.assert();
            })
            .catch(err => {
                return Observable.of(null);
            });
    }

    public static buildQueues(module, connection: ConnectionManager): Observable<any> {
        return Observable.of(module)
            .filter(_ => !!_)
            .flatMap(_ => this.metadataFromDeclarations<QueueDecoratorInterface, typeof GenericQueue>(_.declarations, 'Queue'))
            .flatMap(_ => DependencyInjection.instantiateComponent<GenericQueue>(_.token, module.di).map(instance => ({ instance, _ })))
            // Assert queue
            .mergeMap(({ instance, _ }) => {
                const queue = new QueueManager<typeof instance>(connection.getDefaultChannel(), instance);
                return Observable.forkJoin(queue.assert(), Observable.of(_));
            })
            // Bind queue
            .mergeMap(([queue, _]) => {
                if (Array.isArray(_.data.binds)) {
                    return Observable
                        .forkJoin(_.data.binds.map(bind => queue.bind(bind.exchange.getMeta().name, bind.pattern)))
                        .map(() => queue);
                }

                return Observable.of(queue);
            })
            // Register messages related to queue
            // Consume queue
            .mergeMap((queue) => {
                const messageRouter = new MessageRouter();
                return this.registerMessages(module, queue, messageRouter)
                    .defaultIfEmpty(null)
                    .map(() => {
                        const messageDispatcher = (ch: ChannelInterface, message: RabbitMessage): Observable<MessageResult> => {
                            const obs = messageRouter.dispatch(ch, message);
                            obs.catch(err => {
                                if (err.code === 'MESSAGE_CLASS_NOT_FOUND' && typeof queue['queue']['onMessage'] === 'function') {
                                    return queue['queue']['onMessage'](message, ch);
                                }

                                return Observable.throw(err);
                            });

                            return obs;
                        }
                        queue.consume(messageDispatcher);
                    });
            });
    }

    public static registerMessages(module, queue: QueueManager, messageRouter: MessageRouter) {
        return this.metadataFromDeclarations<MessageDecoratorInterface, typeof GenericMessage>(module.declarations, 'Message')
            .filter(_ => _.data.queue.getMeta().name === queue.getName())
            .flatMap(_ => DependencyInjection.instantiateComponent<GenericMessage>(_.token, module.di).map(instance => ({ instance, _ })))
            .map(({ instance, _ }) => {
                return messageRouter.registerMessage(instance)
            });
    }



    /**
     * Extract metadata filtered by queue
     * from the declarations provided
     *
     * @param  {Type<any>} declarations
     * @returns Array<QueueDecorator>
     */
    private static metadataFromDeclarations<T, D>(declarations: Type<any>[], decoratorName) {
        return Observable
            .from([].concat(declarations))
            .filter(_ => !!_ && !!extractMetadataByDecorator(_, decoratorName))
            .map((_: D) => ({ token: _, data: extractMetadataByDecorator<T>(_, decoratorName) }));
    }

}

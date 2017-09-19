import { Options } from 'amqplib';
import { createDecorator, CoreDecorator } from '@hapiness/core/core/decorators';
import { QueueInterface, ExchangeType, ExchangeInterface } from './interfaces/index';

export interface Bind {
    exchange: typeof ExchangeInterface;
    pattern: string;
}

export interface QueueDecoratorInterface {
    name: string;
    binds?: Array<Bind>;
    options?: Options.AssertQueue;
}
export const Queue: CoreDecorator<QueueDecoratorInterface> = createDecorator<QueueDecoratorInterface>('Queue', {
    name: undefined,
    binds: undefined,
    options: undefined
});

export interface ExchangeDecoratorInterface {
    name: string;
    type: ExchangeType;
    options?: Options.AssertExchange;
}
export const Exchange: CoreDecorator<ExchangeDecoratorInterface> = createDecorator<ExchangeDecoratorInterface>('Exchange', {
    name: undefined,
    type: undefined,
    options: undefined
});

export interface MessageDecoratorInterface {
    queue: typeof QueueInterface;
    exchange?: typeof ExchangeInterface;
    isFallback?: boolean;
    routingKey?: string | RegExp;
    filter?: {
        [key: string]: string | RegExp;
    };
}
export const Message: CoreDecorator<MessageDecoratorInterface> = createDecorator<MessageDecoratorInterface>('Message', {
    queue: undefined,
    exchange: undefined,
    isFallback: false,
    routingKey: undefined,
    filter: undefined
});

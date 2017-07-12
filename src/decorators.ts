import { createDecorator, CoreDecorator, Type } from '@hapiness/core/core/decorators';
import { Options } from 'amqplib';
import { ExchangeType, GenericExchange, ExchangeBase } from './managers/ExchangeManager';
import { QueueBase } from './managers/QueueManager';
import { extractMetadataByDecorator } from "@hapiness/core/core";

export interface Bind {
    exchange: typeof ExchangeBase;
    pattern: string;
};

export interface QueueDecoratorInterface {
    name: string;
    binds?: Array<Bind>;
    options?: Options.AssertQueue;
}
export const Queue = createDecorator<QueueDecoratorInterface>('Queue', {
    name: undefined,
    binds: undefined,
    options: undefined
});

export interface ExchangeDecoratorInterface {
    name: string;
    type: ExchangeType;
    options?: Options.AssertExchange;
}
export const Exchange = createDecorator<ExchangeDecoratorInterface>('Exchange', {
    name: undefined,
    type: undefined,
    options: undefined
});

export interface MessageDecoratorInterface {
    queue: typeof QueueBase;
    exchange?: typeof GenericExchange;
    isFallback?: boolean;
    routingKey?: string | RegExp;
    filter?: {
        [key: string]: string | RegExp
    }
}
export const Message = createDecorator<MessageDecoratorInterface>('Message', {
    queue: undefined,
    exchange: undefined,
    isFallback: false,
    routingKey: undefined,
    filter: undefined,
});

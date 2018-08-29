import { createDecorator, CoreDecorator, Type } from '@hapiness/core';
import { Options } from 'amqplib';
import { ExchangeType, ChannelOptions } from '../interfaces';

export interface ExchangeDecoratorInterface {
    name: string;
    type: ExchangeType;
    options?: Options.AssertExchange;
    channel?: ChannelOptions;
    providers?: Array<Type<any> | any>;
}
export const Exchange: CoreDecorator<ExchangeDecoratorInterface> = createDecorator<ExchangeDecoratorInterface>('Exchange', {
    name: undefined,
    type: undefined,
    options: undefined,
    channel: undefined,
    providers: [],
});

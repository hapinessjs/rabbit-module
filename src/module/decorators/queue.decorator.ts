import { Type } from '@hapiness/core';
import { createDecorator, CoreDecorator } from '@hapiness/core';
import { Options } from 'amqplib';
import { Bind, ChannelOptions } from '../interfaces';

export interface QueueDecoratorInterface {
    name: string;
    binds?: Array<Bind>;
    options?: Options.AssertQueue;
    channel?: ChannelOptions;
    force_json_decode?: boolean;
    providers?: Array<Type<any> | any>;
}
export const Queue: CoreDecorator<QueueDecoratorInterface> = createDecorator<QueueDecoratorInterface>('Queue', {
    name: undefined,
    binds: undefined,
    options: undefined,
    channel: undefined,
    force_json_decode: false,
    providers: [],
});

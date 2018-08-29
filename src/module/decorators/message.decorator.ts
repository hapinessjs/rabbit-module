import { Type } from '@hapiness/core';
import { createDecorator, CoreDecorator } from '@hapiness/core';

export interface MessageDecoratorInterface {
    queue: Type<any>;
    exchange?: Type<any>;
    routingKey?: string | RegExp;
    filter?: {
        [key: string]: string | RegExp;
    };
    is_fallback?: boolean;
    providers?: Array<Type<any> | any>;
}
export const Message: CoreDecorator<MessageDecoratorInterface> = createDecorator<MessageDecoratorInterface>('Message', {
    queue: undefined,
    exchange: undefined,
    routingKey: undefined,
    filter: undefined,
    is_fallback: false,
    providers: [],
});

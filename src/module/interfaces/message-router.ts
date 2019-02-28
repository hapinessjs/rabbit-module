import { Channel as ChannelInterface } from 'amqplib'
import { Observable } from 'rxjs/Observable';
import { RabbitMessage } from './rabbit-message';
import { MessageResult } from './message-result';
import { CoreModule } from '@hapiness/core';
import { MessageDecoratorInterface } from '../decorators';
import { QueueDispatcherOptions } from './queue-dispatcher-options';

export interface RegisterMessageOptions {
    token: any;
    module: CoreModule;
    data: MessageDecoratorInterface;
};

export interface MessageRouterInterface {
    registerMessage({ token, module }: RegisterMessageOptions): Observable<any>;
    getDispatcher(ch: ChannelInterface, message: RabbitMessage, { queue }: QueueDispatcherOptions):
        Observable<() => Observable<MessageResult>>;
}

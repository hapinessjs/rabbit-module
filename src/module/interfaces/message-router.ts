import { Channel as ChannelInterface } from 'amqplib'
import { Observable } from 'rxjs/Observable';
import { RabbitMessage } from './rabbit-message';
import { MessageResult } from './message-result';
import { CoreModule } from '@hapiness/core';
import { MessageDecoratorInterface } from '../decorators';

export interface RegisterMessageOptions {
    token: any;
    module: CoreModule;
    data: MessageDecoratorInterface;
};

export interface MessageRouterInterface {
    registerMessage({ token, module }: RegisterMessageOptions): Observable<any>;
    getDispatcher(ch: ChannelInterface, message: RabbitMessage): Observable<() => Observable<MessageResult>>;
}

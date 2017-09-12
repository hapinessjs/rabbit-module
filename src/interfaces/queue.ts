import { Observable } from 'rxjs';
import { MessageResult, RabbitMessage } from './index';
import { Options, Channel } from 'amqplib';
import { Bind } from '../decorators';

export class QueueInterface {
    onAsserted?(): any;
    onMessage?(message: RabbitMessage, ch?: Channel): Observable<MessageResult>;
}

export interface QueueOptions {
    name: string;
    binds?: Array<Bind>;
    options?: Options.AssertQueue;
}

export interface ConsumeOptions {
    decodeMessageContent?: boolean;
    errorHandler?: (err: Error, message?: RabbitMessage, ch?: Channel) => void | null;
}

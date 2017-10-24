import { Observable } from 'rxjs';
import { Channel } from 'amqplib';
import { RabbitMessage } from './rabbit-message';
import { MessageResult } from './message-result';

export class QueueInterface {
    onAsserted?(): any;
    onMessage?(message: RabbitMessage, ch?: Channel): Observable<MessageResult>;
}

import { Channel } from 'amqplib';
import { Observable } from 'rxjs';
import { RabbitMessage } from './rabbit-message';
import { MessageResult } from './message-result';

export interface MessageInterface {
    onMessage(message: RabbitMessage, ch: Channel): Observable<MessageResult | null>;
}

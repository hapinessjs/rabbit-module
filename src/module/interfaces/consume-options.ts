import { RabbitMessage } from './index';
import { Channel } from 'amqplib';

export interface ConsumeOptions {
    decodeMessageContent?: boolean;
    errorHandler?: (err: Error, message?: RabbitMessage, ch?: Channel) => void | null;
}

import { RabbitMessage } from '.';
import { Channel } from 'amqplib';

export interface ConsumeOptions {
    decodeMessageContent?: boolean;
    force_json_decode?: boolean;
    errorHandler?: (err: Error, message?: RabbitMessage, ch?: Channel) => void | null;
}

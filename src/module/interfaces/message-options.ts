import { Options } from 'amqplib';

export interface MessageOptions extends Options.Publish {
    queue?: string;
    exchange?: string;
    routingKey?: string;
    headers?: any;
    json?: boolean;
}

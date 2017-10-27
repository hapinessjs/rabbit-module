import { Options } from 'amqplib';
import { Bind } from '../decorators';

export interface QueueOptions {
    name: string;
    binds?: Array<Bind>;
    options?: Options.AssertQueue;
    force_json_decode?: boolean;
}

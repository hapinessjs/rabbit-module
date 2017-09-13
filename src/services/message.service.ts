import { Injectable } from '@hapiness/core';
import { ChannelService } from './channel.service';
import { QueueInterface } from '../interfaces/queue';
import { ExchangeInterface } from '../interfaces/exchange';
import { MessageOptions } from '../interfaces/message';
import { sendMessage } from '../Message';
import { QueueDecoratorInterface, ExchangeDecoratorInterface } from '../decorators';
import { extractMetadataByDecorator } from '@hapiness/core/core';
import { Channel } from 'amqplib';

export interface CreateChannelOptions {
    prefetch?: number;
    global?: boolean;
}
@Injectable()
export class MessageService {
    private sendMessage;
    constructor(private _channelService: ChannelService) {
        this.sendMessage = sendMessage;
    }

    sendToQueue(message, queue: typeof QueueInterface, options?: MessageOptions): boolean {
        const ch = this._channelService.getChannel();
        const _options: MessageOptions = Object.assign({}, options);
        const meta = extractMetadataByDecorator<QueueDecoratorInterface>(queue, 'Queue');
        _options.queue = meta.name;

        return this.send(message, _options, ch);
    }

    publish(message, exchange: typeof ExchangeInterface, options?: MessageOptions): boolean {
        const ch = this._channelService.getChannel();
        const _options: MessageOptions = Object.assign({}, options);
        const meta = extractMetadataByDecorator<ExchangeDecoratorInterface>(exchange, 'Exchange');
        _options.exchange = meta.name;

        return this.send(message, _options, ch);
    }

    send(message, options, ch?: Channel): boolean {
        if (!ch) {
            ch = this._channelService.getChannel();
        }

        return this.sendMessage(ch, message, options);
    }
}

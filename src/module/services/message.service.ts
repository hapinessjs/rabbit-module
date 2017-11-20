import { Injectable, extractMetadataByDecorator } from '@hapiness/core';
import { ChannelService } from './channel.service';
import { MessageOptions, QueueInterface, ExchangeInterface } from '../interfaces';
import { sendMessage } from '../message';
import { QueueDecoratorInterface, ExchangeDecoratorInterface } from '../decorators';
import { Channel } from 'amqplib';

@Injectable()
export class MessageService {
    private _sendMessage;
    constructor(private _channelService: ChannelService) {
        this._sendMessage = sendMessage;
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

        return this._sendMessage(ch, message, options);
    }
}

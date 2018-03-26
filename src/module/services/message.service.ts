import { Injectable, extractMetadataByDecorator } from '@hapiness/core';
import { ChannelService } from './channel.service';
import { MessageOptions, QueueInterface, ExchangeInterface } from '../interfaces';
import { sendMessage } from '../message';
import { QueueDecoratorInterface, ExchangeDecoratorInterface } from '../decorators';
import { Channel } from 'amqplib';
import { MessageStore } from '..';

@Injectable()
export class MessageService {
    private _sendMessage;
    constructor(private _channelService: ChannelService) {
        this._sendMessage = sendMessage;
    }

    canSendMessage(): boolean {
        return this._channelService.connectionManager.isConnected() && !MessageStore.isShutdownRunning();
    }

    sendToQueue(message, queue: typeof QueueInterface | string, options?: MessageOptions): boolean {
        const ch = this._channelService.getChannel();
        const _options: MessageOptions = Object.assign({}, options);
        _options.queue = typeof queue === 'string' ? queue : extractMetadataByDecorator<QueueDecoratorInterface>(queue, 'Queue').name;

        return this.send(message, _options, ch);
    }

    publish(message, exchange: typeof ExchangeInterface | string, options?: MessageOptions): boolean {
        const ch = this._channelService.getChannel();
        const _options: MessageOptions = Object.assign({}, options);
        _options.exchange = typeof exchange === 'string' ?
            exchange : extractMetadataByDecorator<ExchangeDecoratorInterface>(exchange, 'Exchange').name;

        return this.send(message, _options, ch);
    }

    send(message, options, ch?: Channel): boolean {
        if (!this.canSendMessage()) {
            throw new Error('Cannot send message if no connection/while shutting down');
        }

        if (!ch) {
            ch = this._channelService.getChannel();
        }

        return this._sendMessage(ch, message, options);
    }
}

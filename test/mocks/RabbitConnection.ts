import { ChannelMock } from './Channel';
import { ConfirmChannel } from 'amqplib';
import { EventEmitter } from 'events';

export class RabbitConnectionMock extends EventEmitter {
    createChannel() {
        return Promise.resolve(new ChannelMock());
    }

    close(): Promise<void> {
        return Promise.resolve();
    }

    createConfirmChannel(): Promise<ConfirmChannel> {
        return Promise.resolve(null);
    }
}

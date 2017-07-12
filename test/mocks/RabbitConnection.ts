import { Observable } from 'rxjs';
import { ChannelMock } from './Channel';
import { ConfirmChannel } from "amqplib";

export class RabbitConnectionMock {

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

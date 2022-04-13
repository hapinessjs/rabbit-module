import * as uuid from 'uuid';
import * as EventEmitter from 'events';
import { Observable } from 'rxjs';
import { Channel as ChannelInterface } from 'amqplib';
import { RabbitMessage } from '../interfaces/rabbit-message';
import { ConnectionManager } from './connection-manager';
import { RabbitMQExt } from '../rabbitmq.extension';

const debug = require('debug')('hapiness:rabbitmq');

export interface StoreMessage extends RabbitMessage {
    uuid: string;
};

export class MessageStoreClass extends EventEmitter {
    private consumerTags: { ch: ChannelInterface, tag: string }[];
    private messages: StoreMessage[];
    private shutdownTimeout;
    private shutdownTimeoutMs: number;
    private shutdown_running: boolean;

    constructor() {
        super();
        this.consumerTags = [];
        this.messages = [];
        this.shutdownTimeoutMs = RabbitMQExt.getConfig().shutdown_timeout || 30000;
        this.shutdown_running = false;
    }

    getConsumerTags(): { ch: ChannelInterface, tag: string }[] {
        return this.consumerTags;
    }

    getMessages(): StoreMessage[] {
        return this.messages;
    }

    addConsumer(ch: ChannelInterface, tag: string): void {
        debug('new consumer tag', tag);
        this.consumerTags.push({ ch, tag });
    }

    removeConsumer(tag: string): void {
        this.consumerTags = this.consumerTags.filter(consumer => consumer.tag !== tag);
    }

    addMessage(_message: RabbitMessage): StoreMessage {
        const message = Object.assign({ uuid: uuid.v4() }, _message);
        this.messages.push(message);
        return message;
    }

    remove(message: StoreMessage): void {
        if (!message.uuid) {
            throw new Error('Message has no uuid');
        }

        debug('remove message', message.uuid);
        this.messages = this.messages.filter(item => item.uuid !== message.uuid);
        debug('messages left', this.messages.length);

        if (!this.hashMessages() && this.isShutdownRunning()) {
            this.emit('messages_queue_empty');
        }

    }

    hashMessages(): boolean {
        return this.messages.length > 0;
    }

    isShutdownRunning(): boolean {
        return this.shutdown_running;
    }

    cancelShutdown(): void {
        clearTimeout(this.shutdownTimeout);
        this.emit('cancel_shutdown');
        this.shutdown_running = false;
    }

    shutdown(connection: ConnectionManager): Observable<any> {
        if (this.shutdown_running) {
            debug('shutdown already running');
            return Observable.of(null);
        }

        this.shutdown_running = true;
        debug('consumers tags count', this.getConsumerTags().length);
        return Observable.from(this.getConsumerTags())
            .do(({ tag }) => debug('cancelling consumer tag', tag))
            .flatMap(({ ch, tag }) => ch.cancel(tag).then(() => tag))
            .do(tag => this.removeConsumer(tag))
            .toArray()
            .flatMap(consumers => {
                if (!consumers.length) {
                    return Observable.of(null);
                }

                return Observable.create(observer => {
                    this.shutdownTimeout = setTimeout(() => {
                        debug('shutdown timeout');
                        observer.error(new Error('rabbitmq shutdown timeout'));
                    }, this.shutdownTimeoutMs);

                    this.once('cancel_shutdown', () => {
                        observer.next();
                        observer.complete();
                    });

                    if (!this.hashMessages()) {
                        debug('no messages, complete shutdown');
                        clearTimeout(this.shutdownTimeout);
                        observer.next();
                        observer.complete();
                    } else {
                        this.once('messages_queue_empty', () => {
                            debug('no more messages, complete shutdown');
                            clearTimeout(this.shutdownTimeout);
                            observer.next();
                            observer.complete();
                        });
                    }
                });
            })
            .do(() => this.shutdown_running = false)
            .do(() => debug('closing connection'))
            .flatMap(() => connection.close())
            .catch(err => {
                this.shutdown_running = false;
                return connection.close().flatMap(() => Observable.throw(err));
            })
    }
}

export const MessageStore = new MessageStoreClass();

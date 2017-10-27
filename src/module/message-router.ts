import * as _get from 'lodash.get';
import { extractMetadataByDecorator } from '@hapiness/core/core';
import { Channel as ChannelInterface } from 'amqplib';
import { Observable } from 'rxjs';
import { MessageResult, RabbitMessage, MessageInterface } from './interfaces';
import { MessageDecoratorInterface, QueueDecoratorInterface, ExchangeDecoratorInterface } from './decorators';

export type messageResult = Observable<MessageResult>;

export class MessageRouter {
    private classes: Array<{
        messageClass: MessageInterface;
        data: MessageDecoratorInterface;
    }>;

    constructor() {
        this.classes = [];
    }

    registerMessage(messageClass: MessageInterface) {
        const data = extractMetadataByDecorator<MessageDecoratorInterface>(messageClass.constructor, 'Message');

        if (!data || !data.queue) {
            throw new Error('Cannot register a message class without a queue');
        }

        if (!data.exchange && !data.routingKey && (!data.filter || !Object.keys(data.filter).length)) {
            throw new Error(`Cannot register a message without an exchange or routingKey or
 filter, use your queue onMessage method instead`);
        }

        this.classes.push({ messageClass, data });
    }

    getDispatcher(ch: ChannelInterface, message: RabbitMessage): Observable<() => messageResult> {
        // If empty message or not an object
        // returns and fake ACK
        if (!message || typeof message !== 'object') {
            return Observable.throw(new Error('Invalid or empty message'));
        }

        const messageClass = this.findClass(message);

        // No Message class found
        // Return null, message will be handled by queue onMessage or ignored
        if (!messageClass) {
            return Observable.of(null);
        }

        if (typeof messageClass.onMessage !== 'function') {
            return Observable.throw(new Error(`Message class ${messageClass.constructor.name} should implement onMessage() method`));
        }

        return Observable.of(() => messageClass.onMessage(message, ch));
    }

    private _testValue(value, compareTo) {
        if (value instanceof RegExp && compareTo) {
            return compareTo.match(value);
        }

        return value === compareTo;
    }

    findClass(message): MessageInterface {
        const score = this.classes
            .map(_class => {
                const meta = _class.data;
                let checks = [];

                if (
                    extractMetadataByDecorator<QueueDecoratorInterface>(meta.queue, 'Queue').name === message.fields.exchange &&
                    !message.fields.routingKey &&
                    !meta.routingKey
                ) {
                    checks.push(true);
                } else if (meta.routingKey && meta.exchange) {
                    checks.push(
                        extractMetadataByDecorator<ExchangeDecoratorInterface>(meta.exchange, 'Exchange').name === message.fields.exchange
                        && typeof meta.routingKey === 'string' && this._testValue(meta.routingKey, message.fields.routingKey)
                    );
                } else if (meta.exchange && !message.fields.routingKey) {
                    checks.push(message.fields.exchange ===
                        extractMetadataByDecorator<ExchangeDecoratorInterface>(meta.exchange, 'Exchange').name);
                }

                let checkFilter = false;
                if (typeof meta.filter === 'object') {
                    const entries = Object.entries(meta.filter);
                    if (entries.length) {
                        checkFilter = !!entries.find(([key, value]) => {
                            return this._testValue(value, _get(message, key.split('.')));
                        });

                        if (checkFilter) {
                            checks.push(true);
                        } else {
                            checks = [];
                        }
                    }
                }

                return {
                    score: checks.filter(Boolean).length,
                    entry: _class,
                    checks
                };
            })
            .filter(item => item.score > 0);

        score.sort((a, b) => {
            if (a.score > b.score) {
                return -1;
            } else if (a.score < b.score) {
                return 1;
            }

            return 0;
        });

        const found = score.shift();
        if (found && found.score > 0) {
            return found.entry.messageClass;
        }

        return null;
    }
}

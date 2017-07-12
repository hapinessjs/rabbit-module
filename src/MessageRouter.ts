import { Channel as ChannelInterface } from 'amqplib';
import { decodeContent } from './Message';
import { Observable } from "rxjs";
import { MessageResult, MessageBase, RabbitMessage } from './Message';
import * as R from 'ramda';
import { extractMetadataByDecorator } from "@hapiness/core/core";
import { MessageDecoratorInterface } from "./decorators";

export class MessageRouter {

    private classes: Array<{ messageClass: any, data: MessageDecoratorInterface }>;

    constructor() {
        this.classes = [];
    }

    registerMessage<T = MessageBase>(messageClass: T) {
        const data = extractMetadataByDecorator<MessageDecoratorInterface>(messageClass.constructor, 'Message');
        this.classes.push({ messageClass, data });
    }

    dispatch(ch: ChannelInterface, message: RabbitMessage): Observable<MessageResult> {

        // If empty message or not an object
        // returns and fake ACK
        if (!message || typeof message !== 'object') {
            return Observable.throw(new Error('Invalid or empty message'));
        }

        const messageClass = this.findClass(message);

        // No Message class found
        if (!messageClass) {
            const err = new Error('Message class not found');
            err['code'] = 'MESSAGE_CLASS_NOT_FOUND';
            return Observable.throw(err);
        }

        return this.process(ch, message, messageClass);
    }

    process(ch, message, messageClass): Observable<MessageResult> {
        if (!(messageClass instanceof MessageBase)) {
            return Observable.throw(new Error('Invalid Message class'));
        }

        if (typeof messageClass.onMessage !== 'function') {
            return Observable.throw(new Error(`Message class ${messageClass.constructor.name} should implement onMessage() method`));
        }

        return messageClass.onMessage(message, ch).map(_ => {
            if (typeof _ !== 'object') {
                return false;
            }

            return _;
        });
    }

    private _testValue(value, compareTo) {
        if (value instanceof RegExp && compareTo) {
            return compareTo.match(value);
        }

        return value === compareTo;
    }

    findClass(message): MessageBase {
        const score = this.classes.map(_class => {
            const meta = _class.data;
            const checks = [];

            if (meta.queue.getMeta().name === message.fields.exchange && !message.fields.routingKey && !meta.routingKey) {
                checks.push(true);
            } else if (message.fields.routingKey && meta.routingKey && meta.exchange) {
                checks.push(meta.exchange.getMeta().name === message.fields.exchange);
                checks.push((typeof meta.routingKey === 'string' && (this._testValue(meta.routingKey, message.fields.routingKey))));
            }


            let checkFilter = false;
            if (typeof meta.filter === 'object') {
                const entries = Object.entries(meta.filter);
                if (entries.length) {
                    checkFilter = !!entries.find(([key, value]) => {
                        return this._testValue(value, R.path(key.split('.'), message));
                    });
                }
            }
            checks.push(checkFilter);

            return { score: checks.filter(Boolean).length, entry: _class, checks };
        }).filter(item => item.score > 0);

        score.sort((a, b) => {
            if (a.score > b.score) return -1;
            else if (a.score < b.score) return 1;
            return 0;
        });

        const found = score.shift();
        if (found && found.score > 0) {
            return found.entry.messageClass;
        }

        return null;
    }

}

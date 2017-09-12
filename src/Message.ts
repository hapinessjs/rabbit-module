import { Channel as ChannelInterface } from 'amqplib';
import * as _has from 'lodash.has';
import { MessageOptions } from './interfaces/index';

export function sendMessage(ch: ChannelInterface, message: any, options: MessageOptions = {}): boolean {
    let { json, headers } = Object.assign({ json: true, headers: {} }, options);

    if (!ch) {
        throw new Error('Cannot send a message without channel');
    }

    if (!message) {
        throw new Error('I will not send an empty message');
    }

    if (typeof json !== 'boolean') {
        json = true;
    }

    if (typeof headers !== 'object' || !headers) {
        headers = {};
    }

    let encodedMessage;
    if (!(message instanceof Buffer)) {
        encodedMessage = Buffer.from(json ? JSON.stringify(message) : message);
    } else {
        encodedMessage = message;
    }

    if (typeof headers.json !== 'boolean') {
        headers = {
            json
        };
    }

    if (options.queue) {
        return ch.sendToQueue(options.queue, encodedMessage, { headers });
    } else if (options.exchange) {
        return ch.publish(options.exchange, options.routingKey, encodedMessage, { headers });
    } else {
        throw new Error('Specify a queue or an exchange');
    }
}

export const decodeContent = (message: any) => {
    if (_has(message, 'fields') && _has(message, 'properties.headers') && _has(message, 'content')) {
        try {
            return message.properties.headers.json ? JSON.parse(message.content.toString()) : message.content;
        } catch (err) {
            throw new Error('Cannot parse JSON message');
        }
    }

    throw new Error('Cannot decode message content');
};

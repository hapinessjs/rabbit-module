import { Channel as ChannelInterface, Connection as ConnectionInterface, Options } from 'amqplib';
import { Observable } from 'rxjs';
import { MessageDecoratorInterface } from "./decorators";
import * as uuid from 'uuid';
import { extractMetadataByDecorator } from "@hapiness/core/core";

export interface MessageResultObject {
    ack?: boolean;
    reject?: boolean;
    requeue?: boolean;
};

export type MessageResult = MessageResultObject | Boolean;

export interface OnMessage {
    onMessage(message: RabbitMessage, ch: ChannelInterface): Observable<MessageResult|null>;
};

export abstract class MessageBase implements OnMessage {

  public getMeta(): MessageDecoratorInterface {
    const base: any = this.constructor;
    return extractMetadataByDecorator<MessageDecoratorInterface>(base, 'Message');
  }

  onMessage(message: RabbitMessage, ch: ChannelInterface): Observable<MessageResult> { return Observable.of(null); }

}

export interface RabbitMessage {
  fields: {
    consumerTag: string;
    deliveryTag: number;
    redelivered: boolean;
    exchange: string;
    routingKey: string;
  };
  properties: {
    contentType?: string;
    contentEncoding?: string;
    headers?: any;
    deliveryMode?: string;
    priority?: any;
    correlationId?: string;
    replyTo?: string;
    expiration?: string;
    messageId?: string;
    timestamp?: string;
    type?: string;
    userId?: string;
    appId?: string;
    clusterId?: string;
  };
  content: Buffer | any;
}

export class GenericMessage extends MessageBase implements OnMessage {
    onMessage(message: RabbitMessage, ch: ChannelInterface): Observable<MessageResult|null> {
        return Observable.of({});
    }
};

const amqplib = require('amqplib');
const _ = require('lodash');

export interface MessageOptions {
    queue?: string;
    exchange?: string;
    routingKey?: string;
    headers?: any;
    json?: boolean;
};

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

  if (typeof headers.json !== "boolean") {
    headers = {
      json,
    };
  }

//   logger.info({ message, meta, options } , `Sending message`);

  if (options.queue) {
    return ch.sendToQueue(options.queue, encodedMessage, { headers });
  } else if (options.exchange) {
    return ch.publish(options.exchange, options.routingKey, encodedMessage, { headers });
  } else {
    throw new Error('Specify a queue or an exchange');
  }
};

export const decodeContent = (message: any) => {
  if (_.has(message, 'fields') && _.has(message, 'properties.headers') && _.has(message, 'content')) {
    return message.properties.headers.json ? JSON.parse(message.content.toString()) : message;
  }

  throw new Error('Cannot decode message content');
};

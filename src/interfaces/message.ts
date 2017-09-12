import { Channel } from 'amqplib';
import { Observable } from 'rxjs';

export interface MessageResultObject {
    ack?: boolean;
    reject?: boolean;
    requeue?: boolean;
}

export type MessageResult = MessageResultObject | Boolean;

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

export interface MessageOptions {
    queue?: string;
    exchange?: string;
    routingKey?: string;
    headers?: any;
    json?: boolean;
}

export interface MessageInterface {
    onMessage(message: RabbitMessage, ch: Channel): Observable<MessageResult | null>;
}

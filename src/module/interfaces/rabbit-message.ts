export interface RabbitMessage<T = Buffer | any> {
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
    content: T;
}

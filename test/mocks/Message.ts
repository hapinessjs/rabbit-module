function makeid(length = 10) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

export function generateMessage(content, options: any = {}, toBuffer = true) {
    return {
        fields:
        { consumerTag: `amq.ctag-${makeid(20)}`,
            deliveryTag: 1,
            redelivered: false,
            exchange: options.exchange || '',
            routingKey: options.routingKey },
        properties:
        { contentType: undefined,
            contentEncoding: undefined,
            headers: { json: true },
            deliveryMode: undefined,
            priority: undefined,
            correlationId: undefined,
            replyTo: undefined,
            expiration: undefined,
            messageId: undefined,
            timestamp: undefined,
            type: undefined,
            userId: undefined,
            appId: undefined,
            clusterId: undefined },
        content: toBuffer ? Buffer.from(JSON.stringify(content)) : content };

};

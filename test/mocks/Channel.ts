export class ChannelMock {
    private consumeCallback;

    assertExchange() {
        return Promise.resolve(null);
    }

    checkExchange() {
        return Promise.resolve(null);
    }

    assertQueue() {
        return Promise.resolve(null);
    }

    checkQueue() {
        return Promise.resolve(null);
    }

    prefetch() {
        return Promise.resolve(null);
    }

    bindQueue() {
        return Promise.resolve(null);
    }

    consume(queue, callback) {
        this.consumeCallback = callback;
        return Promise.resolve(null);
    }

    sendMessage(message) {
        this.consumeCallback(message);
    }

    ack(message) {
        return Promise.resolve(null);
    }

    reject(message, requeue = false) {
        return Promise.resolve(null);
    }

    sendToQueue(queue: string, message: Buffer, options) {
        return Promise.resolve(null);
    }

    publish(exchange: string, routingKey: string, message: Buffer, options) {
        return Promise.resolve(null);
    }
}

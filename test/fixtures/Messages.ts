import { Message } from '../../src/module/decorators';
import { MayonaiseService } from './Services';
import { UserExchange, AnotherExchange, FooExchange } from './Exchanges';
import { Observable } from 'rxjs';
import { AnotherQueue, WorkerQueue } from './Queues';
import { MessageInterface, RabbitMessage } from '../../src/module/interfaces';

@Message({
    queue: AnotherQueue,
    exchange: FooExchange
})
export class FooMessage implements MessageInterface {

    onMessage(message: RabbitMessage) {
        return Observable.of({ ack: true });
    }
}

@Message({
    queue: AnotherQueue,
    exchange: UserExchange,
    routingKey: 'basket',
    filter: {
        'content.action': 'edited'
    }
})
export class BasketEditedMessage implements MessageInterface {

    onMessage(message: RabbitMessage) {
        return Observable.of({ ack: true });
    }
}

@Message({
    queue: AnotherQueue,
    exchange: UserExchange,
    routingKey: 'profile',
    filter: {
        'content.action': 'edited',
        'content.foo': 'bar'
    }
})
export class ProfileEditedMessage implements MessageInterface {

    onMessage(message: RabbitMessage) {
        return Observable.of({ ack: true });
    }
}

@Message({
    queue: AnotherQueue,
    exchange: UserExchange,
    routingKey: 'user',
    filter: {
        'content.action': 'edited'
    }
})
export class UserEditedMessage implements MessageInterface {
    constructor(private _mayo: MayonaiseService) {}

    onMessage(message: RabbitMessage) {
        this._mayo.eat();
        return Observable.of({ ack: true });
    }
}

@Message({
    queue: AnotherQueue,
    exchange: UserExchange,
    routingKey: 'user.created'
})
export class UserCreatedMessage implements MessageInterface {
    constructor(private _mayo: MayonaiseService) {}

    onMessage(message: RabbitMessage) {
        this._mayo.eat();
        return Observable.of({ ack: true });
    }
}

@Message({
    queue: AnotherQueue,
    exchange: UserExchange,
    routingKey: 'user.deleted'
})
export class UserDeletedMessage implements MessageInterface {
    onMessage(message: RabbitMessage) {
        return Observable.of({});
    }
}

@Message({
    queue: AnotherQueue,
    exchange: AnotherExchange,
    routingKey: 'order.created',
    filter: {}
})
export class OrderCreatedMessage implements MessageInterface {
    onMessage(message: RabbitMessage) {
        return Observable.of({ reject: true });
    }
}

@Message({
    queue: AnotherQueue,
    exchange: UserExchange,
    routingKey: 'user.created',
    filter: {
        'content.action': 'nope'
    }
})
export class UserCreatedActionNotMatchedMessage implements MessageInterface {

    onMessage(message: RabbitMessage) {
        return Observable.of({ ack: true });
    }
}

/*
    The filter object can be used to match a message
    on custom keys.
*/
@Message({
    queue: AnotherQueue,
    filter: {
        'content.action': /pokemons_(\w+)/
    }
})
export class PokemonsMessage implements MessageInterface {
    onMessage(message: RabbitMessage) {
        return Observable.of({ ack: true });
    }
}

@Message({
    queue: WorkerQueue,
    filter: {
        'content.action': 'generate_pdf'
    }
})
export class GeneratePdf implements MessageInterface {
    onMessage(message: RabbitMessage) {
        return Observable.of({ reject: true, requeue: true });
    }
}

/*
 This is not allowed, use onMessage() method on your @Queue() instead !
*/
@Message({
    queue: WorkerQueue
})
export class FallbackMessage implements MessageInterface {
    onMessage(message: RabbitMessage) {
        return Observable.of(false);
    }
}

@Message({
    queue: WorkerQueue,
    filter: {
        error: 'invalid_message_class'
    }
})
export class InvalidMessage {}

@Message({
    queue: AnotherQueue,
    exchange: UserExchange,
    routingKey: 'user.created',
    filter: {
        'content.action': 'special'
    }
})
export class UserCreatedActionMessage implements MessageInterface {

    onMessage(message: RabbitMessage) {
        return Observable.of({ ack: true });
    }
}

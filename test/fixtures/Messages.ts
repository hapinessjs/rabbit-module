import { Message } from "../../src/decorators";
import { MessageBase, OnMessage, RabbitMessage } from "../../src/Message";
import { MayonaiseService } from "./Services";
import { UserExchange, AnotherExchange } from './Exchanges';
import { Observable } from "rxjs";
import { AnotherQueue, WorkerQueue } from "./Queues";

@Message({
    queue: AnotherQueue,
    exchange: UserExchange,
    routingKey: 'user.created'
})
export class UserCreatedMessage extends MessageBase implements OnMessage {

    constructor(private _mayo: MayonaiseService) {
        super();
    }

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
export class UserDeletedMessage extends MessageBase implements OnMessage {

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
export class OrderCreatedMessage extends MessageBase implements OnMessage {

    onMessage(message: RabbitMessage) {
        return Observable.of({ reject: true });
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
export class PokemonsMessage extends MessageBase implements OnMessage {

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
export class GeneratePdf extends MessageBase implements OnMessage {

    onMessage(message: RabbitMessage) {
        return Observable.of({ reject: true, requeue: true });
    }

}

/*
 If a message arrive in the worker queue and none of the message above
 match this one will be used as a fallback.
*/
@Message({
    queue: WorkerQueue
})
export class FallbackMessage extends MessageBase implements OnMessage {

    onMessage(message: RabbitMessage) {
        return Observable.of(false);
    }

}

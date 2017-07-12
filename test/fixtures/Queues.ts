import { QueueBase } from '../../src/managers/QueueManager';
import { Queue } from "../../src/decorators";
import { UserExchange, EventsExchange } from "./Exchanges";
import { OnMessage, MessageResult } from "../../src/Message";
import { Observable } from "rxjs";

@Queue({
    name: 'user.queue',
    options: {
        durable: true
    },
    binds: [{
        exchange: UserExchange,
        pattern: 'user.edited'
    }]
})
export class UserQueue extends QueueBase implements OnMessage {

    onAsserted() {}

    onMessage(message): Observable<MessageResult> {
        return Observable.of({ ack: true });
    }

}

@Queue({
    name: 'another.queue',
    options: {
        durable: true
    },
    binds: [{
        exchange: UserExchange,
        pattern: 'user.*'
    }, {
        exchange: EventsExchange,
        pattern: 'order.*'
    }]
})
export class AnotherQueue extends QueueBase {}

@Queue({
    name: 'worker',
    options: {
        durable: true
    }
})
export class WorkerQueue extends QueueBase {}

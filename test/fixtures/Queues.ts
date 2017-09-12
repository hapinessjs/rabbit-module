import { Queue } from '../../src/decorators';
import { UserExchange, EventsExchange } from './Exchanges';
import { MessageResult, QueueInterface } from '../../src/interfaces';
import { Observable } from 'rxjs';

@Queue({
    name: 'user.queue',
    options: {
        durable: true
    },
    binds: [
        {
            exchange: UserExchange,
            pattern: 'user.edited'
        }
    ]
})
export class UserQueue implements QueueInterface {
    onAsserted() {
        return Observable.of(null);
    }

    onMessage(message): Observable<MessageResult> {
        return Observable.of({ ack: true });
    }
}

@Queue({
    name: 'another.queue',
    options: {
        durable: true
    },
    binds: [
        {
            exchange: UserExchange,
            pattern: 'user.*'
        },
        {
            exchange: EventsExchange,
            pattern: 'order.*'
        }
    ]
})
export class AnotherQueue implements QueueInterface {}

@Queue({
    name: 'worker',
    options: {
        durable: true
    }
})
export class WorkerQueue implements QueueInterface {}

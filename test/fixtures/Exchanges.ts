import { Exchange } from '../../src/module/decorators';
import { ExchangeType } from '../../src/module/interfaces';
import { Observable } from 'rxjs';

@Exchange({
    name: 'dont.assert.me.exchange',
    type: ExchangeType.Topic,
    options: {
        durable: true,
        autoDelete: false
    },
    assert: false
})
export class DontAssertMeExchange {}

@Exchange({
    name: 'check.me.exchange',
    type: ExchangeType.Topic,
    options: {
        durable: true,
        autoDelete: false
    },
    assert: false,
    check: true
})
export class DontAssertButCheckExchange {}

@Exchange({
    name: 'user.exchange',
    type: ExchangeType.Topic,
    options: {
        durable: true,
        autoDelete: false
    }
})
export class UserExchange {}

@Exchange({
    name: 'another.exchange',
    type: ExchangeType.Direct
})
export class AnotherExchange {}

@Exchange({
    name: 'foo.exchange',
    type: ExchangeType.Direct
})
export class FooExchange {}

@Exchange({
    name: 'events.all',
    type: ExchangeType.Topic,
    options: {
        durable: true,
        autoDelete: false
    }
})
export class EventsExchange {
    onAsserted() {
        return Observable.of(null);
    }
}

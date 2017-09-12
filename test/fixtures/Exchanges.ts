import { Exchange } from '../../src/decorators';
import { ExchangeType, ExchangeInterface } from '../../src/interfaces';
import { Observable } from 'rxjs';

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
export class AnotherExchange implements ExchangeInterface {}

@Exchange({
    name: 'events.all',
    type: ExchangeType.Topic,
    options: {
        durable: true,
        autoDelete: false
    }
})
export class EventsExchange implements ExchangeInterface {
    onAsserted() {
        return Observable.of(null);
    }
}

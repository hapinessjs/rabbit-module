import { ExchangeType, ExchangeBase } from '../../src/managers/ExchangeManager';
import { Exchange } from "../../src/decorators";

@Exchange({
    name: 'user.exchange',
    type: ExchangeType.Topic,
    options: {
        durable: true,
        autoDelete: false
    }
})
export class UserExchange extends ExchangeBase {}


@Exchange({
    name: 'another.exchange',
    type: ExchangeType.Direct
})
export class AnotherExchange extends ExchangeBase {}

@Exchange({
    name: 'events.all',
    type: ExchangeType.Topic,
    options: {
        durable: true,
        autoDelete: false
    }
})
export class EventsExchange extends ExchangeBase {}

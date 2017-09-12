export class ExchangeInterface {
    onAsserted?(): any;
}

export enum ExchangeType {
    Direct = 'direct',
    Topic = 'topic',
    Fanout = 'fanout'
}

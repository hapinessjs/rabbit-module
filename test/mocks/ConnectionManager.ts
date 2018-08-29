import { ConnectionManager, ChannelManager } from '../../src';
import { RabbitConnectionMock } from './RabbitConnection';
import { ChannelMock } from './Channel';
import { Observable } from 'rxjs';
import { Connection } from 'amqplib';

const debug = require('debug')('hapiness:rabbitmq');

export class ConnectionManagerMock extends ConnectionManager {
    constructor() {
        super(<any>{});
        this['_isConnected'] = true;
        this['_connection'] = <any>new RabbitConnectionMock();
        const ch = new ChannelManager(this);
        ch.setChannel(<any>new ChannelMock());
        this['_defaultChannel'] = ch;
        this.channelStore['_channels']['default'] = ch;
    }

    connect(): Observable<Connection> {
        debug('Mocking connection...');
        return Observable.of(this['_connection']).delay(500);
    }
}

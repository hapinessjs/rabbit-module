import { ConnectionManager } from '../../src/index';
import { RabbitConnectionMock } from './RabbitConnection';
import { ChannelMock } from './Channel';
import { Observable } from 'rxjs';
const debug = require('debug')('hapiness:rabbitmq');

export class ConnectionManagerMock extends ConnectionManager {
    constructor() {
        super(<any>{});
        this['_isConnected'] = true;
        this['connection'] = <any>new RabbitConnectionMock();
        this['defaultChannel'] = <any>new ChannelMock();
    }

    connect() {
        debug('Mocking connection...');
        return Observable.of(this['connection']).delay(500);
    }
}

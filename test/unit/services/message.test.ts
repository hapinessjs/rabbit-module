import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import { RabbitConnectionService, ChannelService } from '../../../src/module/services';
import { ConnectionManagerMock } from '../../mocks/ConnectionManager';
import { MessageService } from '../../../src/module/services';
import { AnotherExchange } from '../../fixtures/Exchanges';
import { UserQueue } from '../../fixtures/Queues';

@suite('- Unit MessageService')
export class MessageServiceUnitTest {
    private channelService;

    before() {
        const connectionManager = new ConnectionManagerMock();
        const connectionService = new RabbitConnectionService(connectionManager);
        this.channelService = new ChannelService(connectionService);
    }

    after() {
        this.channelService = null;
    }

    @test('- Should test new instance')
    testNew() {
        const instance = new MessageService(this.channelService);
        unit.object(instance).isInstanceOf(MessageService);
        unit.function(instance.publish);
        unit.function(instance.sendToQueue);
        unit.function(instance.send);
    }

    @test('- Should test publish')
    testPublish() {
        const instance = new MessageService(this.channelService);
        const stub = unit.stub(instance, '_sendMessage');
        stub.returns(true);
        instance.publish({ foo: 'bar' }, AnotherExchange);
    }

    @test('- Should test sendToQueue')
    testSendToQueue() {
        const instance = new MessageService(this.channelService);
        const stub = unit.stub(instance, '_sendMessage');
        stub.returns(true);
        instance.sendToQueue({ foo: 'bar' }, UserQueue);
    }

    @test('- Should test send')
    testSend() {
        const instance = new MessageService(this.channelService);
        const stub = unit.stub(instance, '_sendMessage');
        stub.returns(true);
        instance.send({ foo: 'bar' }, { exchange: 'foo.bar.exchange' });
    }
}

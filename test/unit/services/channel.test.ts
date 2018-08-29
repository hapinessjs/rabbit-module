import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import { Observable } from 'rxjs/Observable';
import { RabbitConnectionService, ChannelService } from '../../../src/module/services';
import { ChannelManager } from '../../../src';
import { ConnectionManagerMock } from '../../mocks/ConnectionManager';
import { ChannelMock } from '../../mocks/Channel';

@suite('- Unit ChannelService')
export class ChannelServiceUnitTest {
    static stub_sendMessage: any;
    private static connectionManager: ConnectionManagerMock;

    static before() {
        this.connectionManager = new ConnectionManagerMock();
    }

    @test('- Should test new instance')
    testNew() {
        const connectionService = new RabbitConnectionService(ChannelServiceUnitTest.connectionManager);

        const instance = new ChannelService(connectionService);
        unit.function(instance.create);
        unit.function(instance.upsert);
        unit.function(instance.get);
        unit.function(instance.getChannel);
    }

    @test('- Should test create channel')
    testCreateChannel(done) {
        const connectionService = new RabbitConnectionService(ChannelServiceUnitTest.connectionManager);

        const instance = new ChannelService(connectionService);
        const obs = instance.create('publish');
        obs.subscribe(ch => {
            unit.object(instance.getChannel('publish'));
            done();
        });
    }

    @test('- Should throw with no connection')
    testThrow() {
        const connectionService = new RabbitConnectionService(ChannelServiceUnitTest.connectionManager);

        const stub = unit.stub(ChannelServiceUnitTest.connectionManager, 'isConnected');
        stub.returns(false);

        unit
            .exception(_ => {
                unit.when('No connection', new ChannelService(connectionService));
            })
            .isInstanceOf(Error)
            .hasProperty('message', 'Connect to RabbitMQ before using ChannelService');
        stub.restore();
    }

    @test('- Should test upsert channel')
    testUpsertChannel(done) {
        const connectionService = new RabbitConnectionService(ChannelServiceUnitTest.connectionManager);

        const instance = new ChannelService(connectionService);

        const pending = [];

        pending.push(
            instance.upsert().map(ch => {
                unit.object(instance.get()).isInstanceOf(ChannelManager);
            })
        );

        pending.push(
            instance.upsert('publish').map(ch => {
                unit.object(instance.get('publish')).isInstanceOf(ChannelManager);
            })
        );

        pending.push(
            instance.upsert('receive').map(ch => {
                unit.object(instance.get('receive')).isInstanceOf(ChannelManager);
            })
        );

        pending.push(
            instance.upsert('worker', { prefetch: 1 }).map(ch => {
                unit.object(instance.get('worker')).isInstanceOf(ChannelManager);
            })
        );

        pending.push(
            instance.create().map(ch => {
                unit
                    .object(instance.get('default'))
                    .isInstanceOf(ChannelManager)
                    .is(ch);
            })
        );

        Observable.forkJoin(pending).subscribe(_ => done());
    }

    @test('- Should test get channel')
    testGetChannel(done) {
        const connectionService = new RabbitConnectionService(ChannelServiceUnitTest.connectionManager);

        const instance = new ChannelService(connectionService);

        unit.object(instance.getChannel()).isInstanceOf(ChannelMock);
        unit.object(instance.getChannel('default')).isInstanceOf(ChannelMock);
        unit.value(instance.getChannel('foo')).is(null);

        instance.create('foo').subscribe(channel => {
            unit.object(channel).isInstanceOf(ChannelManager);
            unit.object(instance.getChannel('foo')).isInstanceOf(ChannelMock);
            done();
        });
    }
}

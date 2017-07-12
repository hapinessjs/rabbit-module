import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import { Observable } from 'rxjs/Observable';

import { ConnectionManager } from '../../../src/managers/ConnectionManager';
import { RabbitConnectionMock } from '../../mocks/RabbitConnection';
import { ChannelMock } from '../../mocks/Channel';
import * as bluebird from 'bluebird';

const data: any = {
    instance: ConnectionManager
};

@suite('- Unit Connection')
class ConnectTest {

    @test('- Should create new instance')
    testNewOk() {
        const instance = new ConnectionManager({ host: 'localhost' });
        unit.object(instance).isInstanceOf(ConnectionManager);
        unit.function(instance.isConnected);
        unit.function(instance.isConnecting);
        unit.function(instance.getDefaultChannel);
        unit.function(instance.getConnection)
        unit.function(instance.connect);
        data.instance = instance;
    }

    @test('- Should mock connection')
    testMock(done) {
        const connectStub = unit.stub(data.instance, '_connect');
        connectStub.returns(bluebird.delay(500).then(_ => new RabbitConnectionMock()));

        unit.bool(data.instance.isConnected()).isFalse();
        unit.bool(data.instance.isConnecting()).isFalse();

        const obs = data.instance.connect();
        unit.object(obs).isInstanceOf(Observable);
        unit.bool(data.instance.isConnecting()).isTrue();
        obs.subscribe(_ => {
            unit.object(_).isInstanceOf(RabbitConnectionMock);
            unit.bool(data.instance.isConnected()).isTrue();
            unit.bool(data.instance.isConnecting()).isFalse();
            unit.object(data.instance.getConnection()).is(_);
            unit.object(data.instance.getDefaultChannel()).isInstanceOf(ChannelMock);
            done();
        });

        const obs2 = data.instance.connect();
        obs2.subscribe(_ => {
            unit.value(_).is(null);
        });
    }

    @test(' - Test options.uri')
    testOptionsUri() {
        const urisOk = [
            'amqp://localhost',
            'amqp://hello:world@localhost',
            'amqp://hello:world@localhost:98798',
            'amqp://hello:world@localhost:98798/vhost',
            'amqp://hello:world@localhost:98798/%2Fvhost',
            'amqp://hello:world@localhost:98798',
        ];

        const urisNOk = [
            'not_good',
            ' amqp://localhost',
            'amqp://xxx:zzzzz@',
            'amqp://xxx:zzzzz#/322d'
        ];

        urisOk.forEach(uri => {
            const instance = new ConnectionManager({ uri });
            unit.object(instance).isInstanceOf(ConnectionManager);
        });

        urisNOk.forEach(uri => {
            unit.exception(_ => {
                unit.when('Invalid uri', new ConnectionManager({ uri }));
            }).isInstanceOf(Error).hasProperty('message', 'Invalid uri');
        });
    }

    @test(' - Test options')
    testOptions() {
        const options = [
            [
                { login: 'keyboard', password: 'cat' },
                'amqp://keyboard:cat@localhost:5672/',
                'amqp://xxx@localhost:5672/',
            ],
            [
                undefined,
                'amqp://localhost:5672/',
                'amqp://localhost:5672/',
            ]
        ];

        options.forEach(option => {
            const instance = new ConnectionManager(<any>option[0]);
            unit.object(instance).isInstanceOf(ConnectionManager);
            unit.string(instance['uri']).is(option[1]);
            unit.string(instance['safeUri']).is(option[2]);
        });
    }

}


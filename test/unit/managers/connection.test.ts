import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import { Observable } from 'rxjs/Observable';

import { ConnectionManager } from '../../../src/module/managers';
import { RabbitConnectionMock } from '../../mocks/RabbitConnection';
import { ChannelMock } from '../../mocks/Channel';

const data: any = {
    instance: ConnectionManager
};

@suite('- Unit Connection')
export class ConnectionUnitTest {
    @test('- Should create new instance')
    testNewOk() {
        const instance = new ConnectionManager();
        unit.object(instance).isInstanceOf(ConnectionManager);
        unit.function(instance.isConnected);
        unit.function(instance.isConnecting);
        unit.function(instance.connect);
        data.instance = instance;
    }

    @test('- Should mock connection')
    testMock(done) {
        const connectStub = unit.stub(data.instance, '_connect');
        connectStub.returns(Promise.resolve(new RabbitConnectionMock()));

        unit.bool(data.instance.isConnected()).isFalse();
        unit.bool(data.instance.isConnecting()).isFalse();

        const obs = data.instance.connect();
        unit.object(obs).isInstanceOf(Observable);
        unit.bool(data.instance.isConnecting()).isTrue();
        obs.subscribe(_ => {
            unit.object(_).isInstanceOf(RabbitConnectionMock);
            unit.bool(data.instance.isConnected()).isTrue();
            unit.bool(data.instance.isConnecting()).isFalse();
            unit.object(data.instance.connection).is(_);
            unit.object(data.instance.defaultChannel).isInstanceOf(ChannelMock);
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
            'amqp://hello:world@localhost:98798'
        ];

        const urisNOk = ['not_good', ' amqp://localhost', 'amqp://xxx:zzzzz@', 'amqp://xxx:zzzzz#/322d'];

        urisOk.forEach(uri => {
            const instance = new ConnectionManager({ uri });
            unit.object(instance).isInstanceOf(ConnectionManager);
        });

        urisNOk.forEach(uri => {
            unit
                .exception(_ => {
                    unit.when('Invalid uri', new ConnectionManager({ uri }));
                })
                .isInstanceOf(Error)
                .hasProperty('message', 'Invalid uri');
        });
    }

    @test(' - Test options')
    testOptions() {
        const options = [
            [{ login: 'keyboard', password: 'cat' }, 'amqp://keyboard:cat@localhost:5672'],
            [{ retry: { maximum_attempts: 0 } }, 'amqp://localhost:5672'],
            [{ params: { heartBeat: 30 } }, 'amqp://localhost:5672?heartBeat=30'],
            [{ params: { heartBeat: 30 }, vhost: '/my_vhost' }, 'amqp://localhost:5672/%2Fmy_vhost?heartBeat=30'],
            [undefined, 'amqp://localhost:5672']
        ];

        options.forEach(option => {
            const instance = new ConnectionManager(<any>option[0]);
            unit.object(instance).isInstanceOf(ConnectionManager);
            unit.string(instance.uri).is(option[1]);
        });
    }

    @test(' - Test openConnection when errors')
    testOpenConnectionErrors(done) {
        const instance = new ConnectionManager({ retry: { delay: 100, maximum_attempts: 5 } });
        instance['_connect'] = () => <any>Promise.reject(new Error('Cannot connect'));
        instance.openConnection().subscribe(
            () => done(new Error('Should not be here')),
            err => {
                unit
                    .object(err)
                    .isInstanceOf(Error)
                    .hasProperty('message', 'Retry limit exceeded');
                done();
            }
        );
    }

    @test(' - Test openConnection error and then ok')
    testOpenConnectionErrorsAndThenOk(done) {
        const instance = new ConnectionManager({ retry: { delay: 100, maximum_attempts: 5 } });
        instance['_connect'] = () => <any>Promise.reject(new Error('Cannot connect'));
        const connectStub = unit.stub(instance, '_connect');
        setTimeout(() => {
            instance['_connect'] = () => <any>Promise.resolve(null);
        }, 300);

        instance.openConnection().subscribe(
            () => {
                unit.number(connectStub.callCount).is(3);
                done();
            },
            () => done(new Error('Should not be here'))
        );
    }

    @test(' - Test handleDisconnection')
    testhandleDisconnection(done) {
        const instance = new ConnectionManager({ retry: { delay: 100, maximum_attempts: 5 } });
        instance['_connection'] = <any>new RabbitConnectionMock();
        unit.function(instance['_handleDisconnection']);
        instance['_handleDisconnection']();
        Observable.fromEvent(instance, 'error').subscribe(
            value => {
                unit
                    .object(value)
                    .isInstanceOf(Error)
                    .hasProperty('message', 'Connection error');
                done();
            },
            err => done(new Error('Should not be here'))
        );
        instance['_connection'].emit('error', new Error('Connection error'));
    }
}

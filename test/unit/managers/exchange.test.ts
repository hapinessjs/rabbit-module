import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import * as Message from '../../../src/Message';
import { Observable } from 'rxjs/Observable';

import { ExchangeManager, ExchangeType } from '../../../src/managers/ExchangeManager';
import { RabbitConnectionMock } from '../../mocks/RabbitConnection';
import { ChannelMock } from '../../mocks/Channel';
import { UserExchange } from '../../fixtures/Exchanges';
import * as bluebird from 'bluebird';

@suite('- Unit Exchange')
class ConnectTest {
    static stub_sendMessage: any;

    static before() {
        ConnectTest.stub_sendMessage = unit.stub(Message, 'sendMessage').returns(true);
    }

    static after() {
        ConnectTest.stub_sendMessage.restore();
    }

    @test('- Should test with exchange as options')
    testNew(done) {
        const ch = new ChannelMock();
        unit.spy(ch, 'assertExchange');
        const instance = new ExchangeManager(<any>ch, { name: 'user.exchange', type: ExchangeType.Direct });
        unit.function(instance.getName);
        unit.function(instance.assert);
        unit.function(instance.isAsserted);
        unit.function(instance.check);
        unit.function(instance.sendMessage);
        const obs = instance.assert();
        obs.subscribe(_ => {
            unit.bool(ch.assertExchange['calledOnce']).isTrue();
            unit.bool(instance.isAsserted()).isTrue();
            done();
        });
    }

    @test('- Should throw if invalid params')
    testInvalidParams() {
        const ch = new ChannelMock();
        unit.exception(_ => {
            unit.when('Invalid params', new ExchangeManager(<any>ch, <any>'xaxa'));
        }).isInstanceOf(Error).hasProperty('message', 'Invalid exchange parameter');
    }

    @test('- Should test with an exchange class')
    testUserExchange() {
        const ch = new ChannelMock();
        unit.spy(ch, 'assertExchange');
        const instance = new ExchangeManager<UserExchange>(<any>ch, new UserExchange());
        const obs = instance.assert();
        obs.subscribe(_ => {
            unit.bool(ch.assertExchange['calledOnce']).isTrue();
            unit.bool(instance.isAsserted()).isTrue();
            unit.value(instance['exchange'].getName()).is('user.exchange');
        });
    }

    @test('- Should test sendMessage')
    testSendMessage() {
        const ch = new ChannelMock();
        const instance = new ExchangeManager(<any>ch, new UserExchange());
        instance.sendMessage({ hello: 'world' });
        unit.bool(ConnectTest.stub_sendMessage.calledOnce).isTrue();
        unit.array(ConnectTest.stub_sendMessage.firstCall.args)
            .is([ ch, { hello: 'world' }, { exchange: 'user.exchange', routingKey: null } ]);
    }

    @test('- Test check exchange')
    testCheck(done) {
        const ch = new ChannelMock();
        unit.spy(ch, 'checkExchange');
        const instance = new ExchangeManager(<any>ch, new UserExchange());
        const obs = instance.check();
        obs.subscribe(_ => {
            unit.bool(ch.checkExchange['calledOnce']).isTrue();
            unit.array(ch.checkExchange['firstCall'].args).is(['user.exchange']);
            done();
        });
    }

}


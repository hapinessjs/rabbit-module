import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import * as Message from '../../../src/module/message';

import { ExchangeManager, ExchangeWrapper } from '../../../src/module/managers';
import { ChannelMock } from '../../mocks/Channel';
import { UserExchange, EventsExchange } from '../../fixtures/Exchanges';
import { ExchangeType } from '../../../src/module/interfaces';
import { extractMetadataByDecorator } from '@hapiness/core';

@suite('- Unit Exchange')
export class ExchangeServiceUnitTest {
    static stub_sendMessage: any;

    private ch;
    private userExchange;
    private userExchangeWrapper: ExchangeWrapper;
    private eventsExchangeWrapper: ExchangeWrapper;

    static before() {
        ExchangeServiceUnitTest.stub_sendMessage = unit.stub(Message, 'sendMessage').returns(true);
    }

    static after() {
        ExchangeServiceUnitTest.stub_sendMessage.restore();
    }

    before() {
        this.ch = new ChannelMock();
        unit.spy(this.ch, 'assertExchange');
        unit.spy(this.ch, 'checkExchange');

        this.userExchange = new UserExchange();
        this.userExchangeWrapper = new ExchangeWrapper(this.userExchange, extractMetadataByDecorator(UserExchange, 'Exchange'));
        this.eventsExchangeWrapper = new ExchangeWrapper(new EventsExchange(), extractMetadataByDecorator(EventsExchange, 'Exchange'));
    }

    after() {
        this.ch = null;
        this.userExchange = null;
        this.userExchangeWrapper = null;
    }

    @test('- Should test with exchange as options')
    testNew(done) {
        const instance = new ExchangeManager(<any>this.ch, { name: 'user.exchange', type: ExchangeType.Direct });
        unit.function(instance.getName);
        unit.function(instance.assert);
        unit.function(instance.isAsserted);
        unit.function(instance.check);
        unit.function(instance.sendMessage);
        const obs = instance.assert();
        obs.subscribe(_ => {
            unit.bool(this.ch.assertExchange['calledOnce']).isTrue();
            unit.bool(instance.isAsserted()).isTrue();
            done();
        });
    }

    @test('- Should throw if invalid params')
    testInvalidParams() {
        const ch = new ChannelMock();
        unit
            .exception(_ => {
                unit.when('Invalid params', new ExchangeManager(<any>ch, <any>'xaxa'));
            })
            .isInstanceOf(Error)
            .hasProperty('message', 'Invalid exchange parameter');
    }

    @test('- Should test with an exchange class')
    testUserExchange() {
        const instance = new ExchangeManager(<any>this.ch, this.userExchangeWrapper);
        const obs = instance.assert();
        obs.subscribe(_ => {
            unit.bool(this.ch.assertExchange['calledOnce']).isTrue();
            unit.bool(instance.isAsserted()).isTrue();
            unit.string(instance.getName()).is('user.exchange');
        });
    }

    @test('- Should test onAsserted method')
    testOnAsserted(done) {
        const instance = new ExchangeManager(<any>this.ch, this.eventsExchangeWrapper);
        unit.spy(instance['_exchange'], 'onAsserted');
        instance.assert().subscribe(_ => {
            unit.bool(this.ch.assertExchange['calledOnce']).isTrue();
            unit.bool(instance['_exchange']['onAsserted']['calledOnce']).isTrue();
            done();
        });
    }

    @test('- Should test sendMessage')
    testSendMessage() {
        const instance = new ExchangeManager(<any>this.ch, this.userExchangeWrapper);
        instance.sendMessage({ hello: 'world' });
        unit.bool(ExchangeServiceUnitTest.stub_sendMessage.calledOnce).isTrue();
        unit
            .array(ExchangeServiceUnitTest.stub_sendMessage.firstCall.args)
            .is([this.ch, { hello: 'world' }, { exchange: 'user.exchange', routingKey: null }]);
    }

    @test('- Test check exchange')
    testCheck(done) {
        const instance = new ExchangeManager(<any>this.ch, this.userExchangeWrapper);
        const obs = instance.check();
        obs.subscribe(_ => {
            unit.bool(this.ch.checkExchange['calledOnce']).isTrue();
            unit.array(this.ch.checkExchange['firstCall'].args).is(['user.exchange']);
            done();
        });
    }

    @test('- Test ExchangeWrapper')
    testExchangeWrapper() {
        const wrapper = new ExchangeWrapper(null, null);
        unit.value(wrapper.getMeta()).is(null);
        unit.value(wrapper.getName()).is(null);
        unit.value(wrapper.getAssertOptions()).is(null);
    }
}

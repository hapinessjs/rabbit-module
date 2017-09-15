import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import * as Message from '../../../src/module/message';
import { Observable } from 'rxjs/Observable';

import { QueueManager, QueueWrapper } from '../../../src/module/managers';
import { ChannelMock } from '../../mocks/Channel';
import { UserQueue, AnotherQueue } from '../../fixtures/Queues';
import { UserExchange } from '../../fixtures/Exchanges';
import { generateMessage } from '../../mocks/Message';
import { extractMetadataByDecorator } from '@hapiness/core/core';

@suite('- Unit Queue')
export class QueueServiceUnitTest {
    static stub_sendMessage: any;

    private ch;
    private userQueue;
    private anotherQueue;
    private userQueueWrapper;
    private anotherQueueWrapper;

    static before() {
        QueueServiceUnitTest.stub_sendMessage = unit.stub(Message, 'sendMessage').returns(true);
    }

    static after() {
        QueueServiceUnitTest.stub_sendMessage.restore();
    }

    before() {
        this.ch = new ChannelMock();
        unit.spy(this.ch, 'assertQueue');
        unit.spy(this.ch, 'bindQueue');
        unit.spy(this.ch, 'checkQueue');
        unit.spy(this.ch, 'consume');

        this.userQueue = new UserQueue();
        unit.spy(this.userQueue, 'onAsserted');
        unit.spy(this.userQueue, 'onMessage');

        this.anotherQueue = new AnotherQueue();

        this.userQueueWrapper = new QueueWrapper(this.userQueue, extractMetadataByDecorator(UserQueue, 'Queue'));
        this.anotherQueueWrapper = new QueueWrapper(this.anotherQueue, extractMetadataByDecorator(AnotherQueue, 'Queue'));
    }

    after() {
        this.ch = null;
        this.userQueue = null;
        this.anotherQueue = null;
        this.userQueueWrapper = null;
        this.anotherQueueWrapper = null;
    }

    @test('- Should test with queue as options')
    testNew() {
        const instance = new QueueManager(<any>this.ch, { name: 'user.queue' });
        unit.function(instance.assert);
        unit.function(instance.check);
        unit.function(instance.getName);
        unit.function(instance.isAsserted);
        unit.function(instance.consume);
        unit.function(instance.sendMessage);
        unit.function(instance.bind);
        unit.function(instance.createBinds);
        unit.bool(instance.isAsserted()).isFalse();
        unit.value(instance.getName()).is('user.queue');
    }

    @test('- Should test with queue class')
    testNewWithClass(done) {
        const instance = new QueueManager(<any>this.ch, this.userQueueWrapper);
        unit.value(instance.getName()).is('user.queue');
        const obs = instance.assert();
        obs.subscribe(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            unit.bool(instance['_queue']['onAsserted']['calledOnce']).isTrue();
            done();
        });
    }

    @test('- Should test with invalid queue param')
    testInvalidParam() {
        unit
            .exception(_ => {
                unit.when('Invalid params', new QueueManager(<any>this.ch, <any>'xaxa'));
            })
            .isInstanceOf(Error)
            .hasProperty('message', 'Invalid queue parameter');
    }

    @test('- Should test binding to exchange')
    testBinding(done) {
        const instance = new QueueManager(<any>this.ch, this.userQueueWrapper);
        unit.value(instance.getName()).is('user.queue');
        const obs = instance.assert();
        obs
            .flatMap(_ => {
                unit.bool(instance.isAsserted()).isTrue();
                return instance.createBinds();
            })
            .flatMap(_ => {
                return instance.bind('another.exchange', 'baz');
            })
            .subscribe(_ => {
                unit.number(this.ch.bindQueue['callCount']).is(2);
                unit.array(this.ch.bindQueue['firstCall'].args).is(['user.queue', 'user.exchange', 'user.edited']);
                unit.array(this.ch.bindQueue['secondCall'].args).is(['user.queue', 'another.exchange', 'baz']);
                done();
            });
    }

    @test('- Should test binding to exchange with options')
    testBindingOptions(done) {
        const instance = new QueueManager(<any>this.ch, this.userQueueWrapper);
        const anotherInstance = new QueueManager(<any>this.ch, { name: 'another.queue' });
        unit.value(instance.getName()).is('user.queue');
        const obs = instance.assert();
        obs
            .flatMap(_ => {
                unit.bool(instance.isAsserted()).isTrue();
                return instance.createBinds([{ exchange: UserExchange, pattern: 'foo' }, { exchange: UserExchange, pattern: 'bar' }]);
            })
            .flatMap(_ => {
                return anotherInstance.createBinds();
            })
            .subscribe(_ => {
                unit.number(this.ch.bindQueue['callCount']).is(2);
                unit.array(this.ch.bindQueue['firstCall'].args).is(['user.queue', 'user.exchange', 'foo']);
                unit.array(this.ch.bindQueue['secondCall'].args).is(['user.queue', 'user.exchange', 'bar']);
                done();
            });
    }

    @test('- Asserting another queue without onAsserted() method')
    testAnotherQueue(done) {
        const instance = new QueueManager(<any>this.ch, this.anotherQueueWrapper);
        instance.assert().subscribe(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            done();
        });
    }

    @test('- Should test consuming')
    testConsume(done) {
        const instance = new QueueManager(<any>this.ch, this.userQueueWrapper);
        unit.value(instance.getName()).is('user.queue');
        const obs = instance.assert();
        obs
            .flatMap(_ => {
                unit.bool(instance.isAsserted()).isTrue();
                return instance.consume();
            })
            .subscribe(_ => {
                unit.bool(this.ch.consume['calledOnce']).isTrue();
                unit.string(this.ch.consume['firstCall'].args[0]).is(instance.getName());
                unit.function(this.ch.consume['firstCall'].args[1]);

                const message1 = generateMessage({ hello: 'world', result: { ack: true } }, { exchange: instance.getName() });
                const message2 = generateMessage({ hello: 'world', result: false }, { exchange: instance.getName() });
                const message3 = generateMessage({ hello: 'world', result: { reject: true } }, { exchange: instance.getName() });
                const message4 = generateMessage({ hello: 'world', result: {} }, { exchange: instance.getName() });
                this.ch.sendMessage(message1);
                this.ch.sendMessage(message2);
                this.ch.sendMessage(message3);
                this.ch.sendMessage(message4);
                unit.number(this.userQueue.onMessage['callCount']).is(4);
                done();
            });
    }

    @test('- Should test consuming with errorHandler and decodeMessageContent to non bool value')
    testConsumeErrorHandlerDecodeNonBool(done) {
        const errorHandler = unit.stub();
        const dispatcher = unit.stub();
        const err = new Error('Cannot read the message');
        dispatcher.returns(Observable.throw(err));
        const instance = new QueueManager(<any>this.ch, this.userQueueWrapper);
        unit.value(instance.getName()).is('user.queue');
        const obs = instance.assert();
        obs
            .flatMap(_ => {
                unit.bool(instance.isAsserted()).isTrue();
                return instance.consume(dispatcher, { decodeMessageContent: <any>'', errorHandler });
            })
            .subscribe(_ => {
                unit.bool(this.ch.consume['calledOnce']).isTrue();
                unit.string(this.ch.consume['firstCall'].args[0]).is(instance.getName());
                unit.function(this.ch.consume['firstCall'].args[1]);

                const message1 = generateMessage({ hello: 'world', result: { ack: true } }, { exchange: instance.getName() });
                this.ch.sendMessage(message1);
                unit.number(dispatcher.callCount).is(1);
                unit.number(errorHandler.callCount).is(1);
                unit.array(errorHandler.firstCall.args).is([err, message1, this.ch]);
                done();
            });
    }

    @test('- Should test consuming with dispatcher func')
    testConsumeDispatcher(done) {
        const instance = new QueueManager(<any>this.ch, this.anotherQueueWrapper);
        unit.value(instance.getName()).is('another.queue');
        const obs = instance.assert();

        const dispatcher = (ch, message) => {
            const content = JSON.parse(Buffer.from(message.content).toString());
            return Observable.of(content.result);
        };
        const spy = unit.spy(dispatcher);

        obs
            .flatMap(_ => {
                unit.bool(instance.isAsserted()).isTrue();
                return instance.consume(spy, { decodeMessageContent: false });
            })
            .subscribe(_ => {
                unit.bool(this.ch.consume['calledOnce']).isTrue();
                unit.string(this.ch.consume['firstCall'].args[0]).is(instance.getName());
                unit.function(this.ch.consume['firstCall'].args[1]);

                const message1 = generateMessage({ hello: 'world', result: { ack: true } }, { exchange: instance.getName() });
                const message2 = generateMessage({ hello: 'world', result: false }, { exchange: instance.getName() });
                const message3 = generateMessage({ hello: 'world', result: { reject: true } }, { exchange: instance.getName() });
                const message4 = generateMessage({ hello: 'world', result: {} }, { exchange: instance.getName() });
                this.ch.sendMessage(message1);
                this.ch.sendMessage(message2);
                this.ch.sendMessage(message3);
                this.ch.sendMessage(message4);
                unit.number(spy['callCount']).is(4);
                done();
            });
    }

    @test('- Should test consuming without dispatcher and onMessage method on queue')
    testConsumeError(done) {
        const instance = new QueueManager(<any>this.ch, this.anotherQueueWrapper);
        unit.value(instance.getName()).is('another.queue');
        const obs = instance.assert();

        obs.subscribe(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            instance.consume();
            const message1 = generateMessage({ hello: 'world', result: { ack: true } }, { exchange: instance.getName() });
            unit
                .exception(() => {
                    unit.when('No consuming possible', this.ch.sendMessage(message1));
                })
                .isInstanceOf(Error)
                .hasProperty('message', `Specifiy a dispatcher or onMessage method for your queue`);
            done();
        });
    }

    @test('- Should test sendMessage')
    testSendMessage() {
        const instance = new QueueManager(<any>this.ch, this.userQueueWrapper);
        instance.sendMessage({ hello: 'world' });
        unit.bool(QueueServiceUnitTest.stub_sendMessage.calledOnce).isTrue();
        unit.array(QueueServiceUnitTest.stub_sendMessage.firstCall.args).is([this.ch, { hello: 'world' }, { queue: 'user.queue' }]);
    }

    @test('- Test check queue')
    testCheck(done) {
        const instance = new QueueManager(<any>this.ch, this.userQueueWrapper);
        const obs = instance.check();
        obs.subscribe(_ => {
            unit.bool(this.ch.checkQueue['calledOnce']).isTrue();
            unit.array(this.ch.checkQueue['firstCall'].args).is(['user.queue']);
            done();
        });
    }

    @test('- Test QueueWrapper')
    testExchangeWrapper() {
        const wrapper = new QueueWrapper(null, null);
        unit.value(wrapper.getMeta()).is(null);
        unit.value(wrapper.getName()).is(null);
        unit.value(wrapper.getBinds()).is(null);
        unit.value(wrapper.getAssertOptions()).is(null);
    }
}

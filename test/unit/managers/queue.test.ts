import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import * as Message from '../../../src/module/message';
import { Observable } from 'rxjs/Observable';

import { QueueManager, QueueWrapper, ChannelManager } from '../../../src/module/managers';
import { ChannelMock } from '../../mocks/Channel';
import { UserQueue, AnotherQueue } from '../../fixtures/Queues';
import { generateMessage } from '../../mocks/Message';
import { extractMetadataByDecorator } from '@hapiness/core';
import { MessageStore } from '../../../src';
import { ConnectionManagerMock } from '../../mocks/ConnectionManager';

@suite('- Unit Queue')
export class QueueServiceUnitTest {
    static stub_sendMessage: any;

    private ch: ChannelManager;
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
        this.ch = new ChannelManager(new ConnectionManagerMock());
        this.ch.setChannel(new ChannelMock());
        unit.spy(this.ch.getChannel(), 'assertQueue');
        unit.spy(this.ch.getChannel(), 'bindQueue');
        unit.spy(this.ch.getChannel(), 'checkQueue');
        unit.spy(this.ch.getChannel(), 'consume');
        unit.spy(this.ch.getChannel(), 'reject');
        unit.spy(this.ch.getChannel(), 'ack');

        this.userQueue = new UserQueue();
        unit.spy(this.userQueue, 'onAsserted');
        unit.spy(this.userQueue, 'onMessage');

        this.anotherQueue = new AnotherQueue();

        this.userQueueWrapper = new QueueWrapper(this.userQueue, {
            token: UserQueue,
            data: extractMetadataByDecorator(UserQueue, 'Queue')
        });
        this.anotherQueueWrapper = new QueueWrapper(this.anotherQueue, {
            token: AnotherQueue,
            data: extractMetadataByDecorator(AnotherQueue, 'Queue')
        });
    }

    after() {
        this.ch = null;
        this.userQueue = null;
        this.anotherQueue = null;
        this.userQueueWrapper = null;
        this.anotherQueueWrapper = null;
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
                unit.number(this.ch.getChannel().bindQueue['callCount']).is(5);
                unit.array(this.ch.getChannel().bindQueue['firstCall'].args).is(['user.queue', 'user.exchange', 'user.edited']);
                unit.array(this.ch.getChannel().bindQueue['secondCall'].args).is(['user.queue', 'user.exchange', 'user.created']);
                unit.array(this.ch.getChannel().bindQueue['thirdCall'].args).is(['user.queue', 'user.exchange', 'user.deleted']);
                unit.array(this.ch.getChannel().bindQueue['getCalls']()[3].args).is(['user.queue', 'user.exchange', '']);
                unit.array(this.ch.getChannel().bindQueue['getCalls']()[4].args).is(['user.queue', 'another.exchange', 'baz']);
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
                unit.bool(this.ch.getChannel().consume['calledOnce']).isTrue();
                unit.string(this.ch.getChannel().consume['firstCall'].args[0]).is(instance.getName());
                unit.function(this.ch.getChannel().consume['firstCall'].args[1]);

                const message1 = generateMessage({ hello: 'world', result: { ack: true } }, { exchange: instance.getName() });
                const message2 = generateMessage({ hello: 'world', result: false }, { exchange: instance.getName() });
                const message3 = generateMessage({ hello: 'world', result: { reject: true } }, { exchange: instance.getName() });
                const message4 = generateMessage({ hello: 'world', result: {} }, { exchange: instance.getName() });
                this.ch.getChannel()['sendMessage'](message1);
                this.ch.getChannel()['sendMessage'](message2);
                this.ch.getChannel()['sendMessage'](message3);
                this.ch.getChannel()['sendMessage'](message4);
                unit.number(this.userQueue.onMessage['callCount']).is(4);
                done();
            });
    }

    @test('- Should test channel reconnect')
    testReconnect(done) {
        const instance = new QueueManager(<any>this.ch, this.userQueueWrapper);
        unit.value(instance.getName()).is('user.queue');
        const obs = instance.assert();
        obs
            .flatMap(_ => {
                unit.bool(instance.isAsserted()).isTrue();
                return instance.consume();
            })
            .subscribe(_ => {
                unit.bool(this.ch.getChannel().consume['calledOnce']).isTrue();
                unit.string(this.ch.getChannel().consume['firstCall'].args[0]).is(instance.getName());
                unit.function(this.ch.getChannel().consume['firstCall'].args[1]);

                setTimeout(() => {
                    this.ch.emit('reconnected');
                    done();
                }, 1000);
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
                instance.setDispatcher(dispatcher);
                return instance.consume({ decodeMessageContent: <any>'', errorHandler });
            })
            .subscribe(_ => {
                unit.bool(this.ch.getChannel().consume['calledOnce']).isTrue();
                unit.string(this.ch.getChannel().consume['firstCall'].args[0]).is(instance.getName());
                unit.function(this.ch.getChannel().consume['firstCall'].args[1]);

                const message1 = generateMessage({ hello: 'world', result: { ack: true } }, { exchange: instance.getName() });
                this.ch.getChannel()['sendMessage'](message1);
                unit.number(dispatcher.callCount).is(1);
                unit.number(errorHandler.callCount).is(1);
                unit.array(errorHandler.firstCall.args).is([err, message1, this.ch.getChannel()]);
                done();
            });
    }

    @test('- Should test consuming with default errorHandler and decodeMessageContent to non bool value')
    testConsumeDefaultErrorHandlerDecodeNonBool(done) {
        const dispatcher = unit.stub();
        const err = new Error('Cannot read the message');
        dispatcher.returns(Observable.throw(err));
        const instance = new QueueManager(<any>this.ch, this.userQueueWrapper);
        unit.value(instance.getName()).is('user.queue');
        const obs = instance.assert();
        obs
            .flatMap(_ => {
                unit.bool(instance.isAsserted()).isTrue();
                instance.setDispatcher(dispatcher);
                return instance.consume({ decodeMessageContent: <any>'' });
            })
            .subscribe(_ => {
                unit.bool(this.ch.getChannel().consume['calledOnce']).isTrue();
                unit.string(this.ch.getChannel().consume['firstCall'].args[0]).is(instance.getName());
                unit.function(this.ch.getChannel().consume['firstCall'].args[1]);

                const message1 = generateMessage({ hello: 'world', result: { ack: true } }, { exchange: instance.getName() });
                this.ch.getChannel()['sendMessage'](message1);
                unit.number(dispatcher.callCount).is(1);
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
                instance.setDispatcher(spy);
                return instance.consume({ decodeMessageContent: false });
            })
            .subscribe(_ => {
                unit.bool(this.ch.getChannel().consume['calledOnce']).isTrue();
                unit.string(this.ch.getChannel().consume['firstCall'].args[0]).is(instance.getName());
                unit.function(this.ch.getChannel().consume['firstCall'].args[1]);

                const message1 = generateMessage({ hello: 'world', result: { ack: true } }, { exchange: instance.getName() });
                const message2 = generateMessage({ hello: 'world', result: false }, { exchange: instance.getName() });
                const message3 = generateMessage({ hello: 'world', result: { reject: true } }, { exchange: instance.getName() });
                const message4 = generateMessage({ hello: 'world', result: {} }, { exchange: instance.getName() });
                this.ch.getChannel()['sendMessage'](message1);
                this.ch.getChannel()['sendMessage'](message2);
                this.ch.getChannel()['sendMessage'](message3);
                this.ch.getChannel()['sendMessage'](message4);
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
            this.ch.getChannel()['sendMessage'](message1);
            done();
        });
    }

    @test('- Should test handleMessageResult: false')
    testHandleMessageResultFalse(done) {
        const instance = new QueueManager(<any>this.ch, this.anotherQueueWrapper);
        const spy = unit.spy(instance, 'handleMessageResult');
        unit.value(instance.getName()).is('another.queue');
        const dispatcher = Observable.of(() => Observable.of(false));

        instance.assert().subscribe(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            instance.setDispatcher((ch, message) => dispatcher);
            instance.consume();
            const message1 = generateMessage(null, { exchange: instance.getName() });
            this.ch.getChannel()['sendMessage'](message1);

            dispatcher.subscribe(r => {
                unit.number(spy.callCount).is(1);
                unit.bool(spy.firstCall.args[1]).isFalse();
                unit.number(instance['_ch'].getChannel()['ack']['callCount']).is(0);
                unit.number(instance['_ch'].getChannel()['reject']['callCount']).is(0);
                done();
            });
        });
    }

    @test('- Should test handleMessageResult: reject')
    testHandleMessageResultReject(done) {
        const instance = new QueueManager(<any>this.ch, this.anotherQueueWrapper);
        const spy = unit.spy(instance, 'handleMessageResult');
        unit.value(instance.getName()).is('another.queue');
        const dispatcher = Observable.of(() => Observable.of({ reject: true }));

        instance.assert().subscribe(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            instance.setDispatcher((ch, message) => dispatcher);
            instance.consume();
            const message1 = generateMessage(null, { exchange: instance.getName() });
            this.ch.getChannel()['sendMessage'](message1);

            dispatcher.subscribe(r => {
                unit.number(spy.callCount).is(1);
                unit.object(spy.firstCall.args[1]).is({ reject: true });
                unit.number(instance['_ch'].getChannel()['reject']['callCount']).is(1);
                done();
            });
        });
    }

    @test('- Should test handleMessageError: reject if shutdown')
    testHandlehandleMessageErrorShutdown(done) {
        const messageStoreStub = unit.stub(MessageStore, 'isShutdownRunning').returns(true);
        const instance = new QueueManager(<any>this.ch, this.anotherQueueWrapper);
        const spy = unit.spy(instance, 'handleMessageError');
        unit.value(instance.getName()).is('another.queue');
        const dispatcher = Observable.of(() => Observable.throw(new Error('Nope')));

        instance.assert().subscribe(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            instance.setDispatcher((ch, message) => dispatcher);
            instance.consume();
            const message1 = generateMessage(null, { exchange: instance.getName() });
            this.ch.getChannel()['sendMessage'](message1);

            dispatcher.subscribe(err => {
                unit.number(spy.callCount).is(1);
                unit.object(spy.firstCall.args[1]).hasProperty('storeMessage');
                unit.number(instance['_ch'].getChannel()['reject']['callCount']).is(1);
                messageStoreStub.restore();
                done();
            }, err => done(err));
        });
    }

    @test('- Should test handleMessageResult: malformed object')
    testHandleMessageResultMalformed(done) {
        const instance = new QueueManager(<any>this.ch, this.anotherQueueWrapper);
        const spy = unit.spy(instance, 'handleMessageResult');
        unit.value(instance.getName()).is('another.queue');
        const dispatcher = Observable.of(() => Observable.of(<any>{ foo: 'bar' }));

        instance.assert().subscribe(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            instance.setDispatcher((ch, message) => dispatcher);
            instance.consume();
            const message1 = generateMessage(null, { exchange: instance.getName() });
            this.ch.getChannel()['sendMessage'](message1);

            dispatcher.subscribe(r => {
                unit.number(spy.callCount).is(1);
                unit.object(spy.firstCall.args[1]).is({ foo: 'bar' });
                unit.number(instance['_ch'].getChannel()['ack']['callCount']).is(1);
                done();
            });
        });
    }

    @test('- Should test handleMessageResult: null')
    testHandleMessageResultNull(done) {
        const instance = new QueueManager(<any>this.ch, this.anotherQueueWrapper);
        const spy = unit.spy(instance, 'handleMessageResult');
        unit.value(instance.getName()).is('another.queue');
        const dispatcher = Observable.of(() => Observable.of(null));

        instance.assert().subscribe(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            instance.setDispatcher((ch, message) => dispatcher);
            instance.consume();
            const message1 = generateMessage(null, { exchange: instance.getName() });
            this.ch.getChannel()['sendMessage'](message1);

            dispatcher.subscribe(r => {
                unit.number(spy.callCount).is(1);
                unit.value(spy.firstCall.args[1]).is(null);
                unit.number(instance['_ch'].getChannel()['ack']['callCount']).is(1);
                done();
            });
        });
    }

    @test('- Should test consuming invalid JSON in a message')
    testInvalidJSON(done) {
        const instance = new QueueManager(<any>this.ch, this.anotherQueueWrapper);
        unit.value(instance.getName()).is('another.queue');
        const obs = instance.assert();

        obs.subscribe(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            const _errorHandler = unit.spy();
            instance.consume({ errorHandler: _errorHandler, force_json_decode: true });
            const message1 = generateMessage(null, { exchange: instance.getName() });
            message1.content = Buffer.from('xaxa');
            this.ch.getChannel()['sendMessage'](message1);
            unit.number(_errorHandler.callCount).is(1);
            unit.object(_errorHandler.firstCall.args[0]).isInstanceOf(Error).hasProperty('message', 'Cannot parse JSON message');
            done();
        });
    }

    @test('- Should test consuming invalid JSON in a message (2)')
    testInvalidJSON2(done) {
        const instance = new QueueManager(<any>this.ch, this.anotherQueueWrapper);
        unit.value(instance.getName()).is('another.queue');
        const obs = instance.assert();


        obs.subscribe(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            instance.consume({ force_json_decode: true });
            const message1 = generateMessage(null, { exchange: instance.getName() });
            message1.content = Buffer.from('xaxa');
            this.ch.getChannel()['sendMessage'](message1);
            done();
        });
    }

    @test('- Should test sendMessage')
    testSendMessage() {
        const instance = new QueueManager(<any>this.ch, this.userQueueWrapper);
        instance.sendMessage({ hello: 'world' });
        unit.bool(QueueServiceUnitTest.stub_sendMessage.calledOnce).isTrue();
        unit.array(QueueServiceUnitTest.stub_sendMessage.firstCall.args)
            .is([this.ch.getChannel(), { hello: 'world' }, { queue: 'user.queue' }]);
    }

    @test('- Test check queue')
    testCheck(done) {
        const instance = new QueueManager(<any>this.ch, this.userQueueWrapper);
        const obs = instance.check();
        obs.subscribe(_ => {
            unit.bool(this.ch.getChannel().checkQueue['calledOnce']).isTrue();
            unit.array(this.ch.getChannel().checkQueue['firstCall'].args).is(['user.queue']);
            done();
        });
    }
}

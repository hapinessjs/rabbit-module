import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import * as Message from '../../../src/Message';
import { Observable } from 'rxjs/Observable';

import { QueueManager } from '../../../src/managers/QueueManager';
import { RabbitConnectionMock } from '../../mocks/RabbitConnection';
import { ChannelMock } from '../../mocks/Channel';
import { UserQueue, AnotherQueue } from '../../fixtures/Queues';
import { UserExchange } from "../../fixtures/Exchanges";
import { generateMessage } from "../../mocks/Message";


@suite('- Unit Queue')
class ConnectTest {
    static stub_sendMessage: any;

    static before() {
        ConnectTest.stub_sendMessage = unit.stub(Message, 'sendMessage').returns(true);
    }

    static after() {
        ConnectTest.stub_sendMessage.restore();
    }

    @test('- Should test with queue as options')
    testNew() {
        const ch = new ChannelMock();
        unit.spy(ch, 'assertQueue');
        const instance = new QueueManager(<any>ch, { name: 'user.queue' });
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
        const ch = new ChannelMock();
        const userQueue = new UserQueue();
        unit.spy(ch, 'assertQueue');
        unit.spy(userQueue, 'onAsserted');
        const instance = new QueueManager(<any>ch, userQueue);
        unit.value(instance.getName()).is('user.queue');
        const obs = instance.assert();
        obs.subscribe(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            unit.bool(instance['queue']['onAsserted'].calledOnce).isTrue();
            done();
        });
    }

    @test('- Should test with invalid queue param')
    testInvalidParam() {
        const ch = new ChannelMock();
        unit.spy(ch, 'assertQueue');
        unit.exception(_ => {
            unit.when('Invalid params', new QueueManager(<any>ch, <any>'xaxa'));
        }).isInstanceOf(Error).hasProperty('message', 'Invalid queue parameter');
    }

    @test('- Should test binding to exchange')
    testBinding(done) {
        const ch = new ChannelMock();
        unit.spy(ch, 'bindQueue');
        const instance = new QueueManager(<any>ch, new UserQueue());
        unit.value(instance.getName()).is('user.queue');
        const obs = instance.assert();
        obs.flatMap(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            return instance.createBinds();
        })
        .flatMap(_ => {
            return instance.bind('another.exchange', 'baz');
        })
        .subscribe(_ => {
            unit.number(ch.bindQueue['callCount']).is(2);
            unit.array(ch.bindQueue['firstCall'].args).is([ 'user.queue', 'user.exchange', 'user.edited' ]);
            unit.array(ch.bindQueue['secondCall'].args).is([ 'user.queue', 'another.exchange', 'baz' ]);
            done();
        });
    }

    @test('- Should test binding to exchange with options')
    testBindingOptions(done) {
        const ch = new ChannelMock();
        unit.spy(ch, 'bindQueue');
        const instance = new QueueManager(<any>ch, new UserQueue());
        const anotherInstance = new QueueManager(<any>ch, { name: 'another.queue' });
        unit.value(instance.getName()).is('user.queue');
        const obs = instance.assert();
        obs.flatMap(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            return instance.createBinds([{ exchange: UserExchange, pattern: 'foo' }, { exchange: UserExchange, pattern: 'bar' }]);
        })
        .flatMap(_ => {
            return anotherInstance.createBinds();
        })
        .subscribe(_ => {
            unit.number(ch.bindQueue['callCount']).is(2);
            unit.array(ch.bindQueue['firstCall'].args).is([ 'user.queue', 'user.exchange', 'foo' ]);
            unit.array(ch.bindQueue['secondCall'].args).is([ 'user.queue', 'user.exchange', 'bar' ]);
            done();
        });
    }

    @test('- Asserting another queue without onAsserted() method')
    testAnotherQueue(done) {
        const ch = new ChannelMock();
        const anotherQueue = new AnotherQueue();
        unit.spy(ch, 'assertQueue');
        const instance = new QueueManager(<any>ch, anotherQueue);
        const obs = instance.assert().subscribe(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            done();
        });
    }

    @test('- Should test consuming')
    testConsume(done) {
        const ch = new ChannelMock();
        unit.spy(ch, 'consume');
        const userQueue = new UserQueue();
        unit.spy(userQueue, 'onMessage');
        const instance = new QueueManager(<any>ch, userQueue);
        unit.value(instance.getName()).is('user.queue');
        const obs = instance.assert();
        obs.flatMap(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            return instance.consume();
        })
        .subscribe(_ => {
            unit.bool(ch.consume['calledOnce']).isTrue();
            unit.string(ch.consume['firstCall'].args[0]).is(instance.getName());
            unit.function(ch.consume['firstCall'].args[1]);

            const message1 = generateMessage({ hello: 'world', result: { ack: true } }, { exchange: instance.getName() });
            const message2 = generateMessage({ hello: 'world', result: false }, { exchange: instance.getName() });
            const message3 = generateMessage({ hello: 'world', result: { reject: true } }, { exchange: instance.getName() });
            const message4 = generateMessage({ hello: 'world', result: {} }, { exchange: instance.getName() });
            ch.sendMessage(message1);
            ch.sendMessage(message2);
            ch.sendMessage(message3);
            ch.sendMessage(message4);
            unit.number(userQueue.onMessage['callCount']).is(4);
            done();
        });
    }

    @test('- Should test consuming with dispatcher func')
    testConsumeDispatcher(done) {
        const ch = new ChannelMock();
        unit.spy(ch, 'consume');
        const anotherQueue = new AnotherQueue();
        const instance = new QueueManager(<any>ch, anotherQueue);
        unit.value(instance.getName()).is('another.queue');
        const obs = instance.assert();

        const dispatcher = (ch, message) => {
            const content = JSON.parse(Buffer.from(message.content).toString());
            return Observable.of(content.result);
        };
        const spy = unit.spy(dispatcher);

        obs.flatMap(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            return instance.consume(spy, { decodeMessageContent: false });
        })
        .subscribe(_ => {
            unit.bool(ch.consume['calledOnce']).isTrue();
            unit.string(ch.consume['firstCall'].args[0]).is(instance.getName());
            unit.function(ch.consume['firstCall'].args[1]);

            const message1 = generateMessage({ hello: 'world', result: { ack: true } }, { exchange: instance.getName() });
            const message2 = generateMessage({ hello: 'world', result: false }, { exchange: instance.getName() });
            const message3 = generateMessage({ hello: 'world', result: { reject: true } }, { exchange: instance.getName() });
            const message4 = generateMessage({ hello: 'world', result: {} }, { exchange: instance.getName() });
            ch.sendMessage(message1);
            ch.sendMessage(message2);
            ch.sendMessage(message3);
            ch.sendMessage(message4);
            unit.number(spy['callCount']).is(4);
            done();
        });
    }

    @test('- Should test consuming without dispatcher and onMessage method on queue')
    testConsumeError(done) {
        const ch = new ChannelMock();
        unit.spy(ch, 'consume');
        const anotherQueue = new AnotherQueue();
        const instance = new QueueManager(<any>ch, anotherQueue);
        unit.value(instance.getName()).is('another.queue');
        const obs = instance.assert();

        obs.subscribe(_ => {
            unit.bool(instance.isAsserted()).isTrue();
            instance.consume();
            const message1 = generateMessage({ hello: 'world', result: { ack: true } }, { exchange: instance.getName() });
            unit.exception(_ => {
                unit.when('No consuming possible', ch.sendMessage(message1));
            }).isInstanceOf(Error).hasProperty('message', `Specifiy a dispatcher or onMessage method for your queue ${instance['queue']}`);
            done();
        });
    }

    @test('- Should test sendMessage')
    testSendMessage() {
        const ch = new ChannelMock();
        const instance = new QueueManager(<any>ch, new UserQueue());
        instance.sendMessage({ hello: 'world' });
        unit.bool(ConnectTest.stub_sendMessage.calledOnce).isTrue();
        unit.array(ConnectTest.stub_sendMessage.firstCall.args)
            .is([ ch, { hello: 'world' }, { queue: 'user.queue' } ]);
    }

    @test('- Test check queue')
    testCheck(done) {
        const ch = new ChannelMock();
        unit.spy(ch, 'checkQueue');
        const instance = new QueueManager(<any>ch, new UserQueue());
        const obs = instance.check();
        obs.subscribe(_ => {
            unit.bool(ch.checkQueue['calledOnce']).isTrue();
            unit.array(ch.checkQueue['firstCall'].args).is(['user.queue']);
            done();
        });
    }

}


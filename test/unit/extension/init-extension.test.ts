import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';
import { RegisterAnnotations } from '../../../src/module/register-annotations';
import { QueueManager, QueueWrapper, ChannelManager } from '../../../src/module/managers';
import { ChannelMock } from '../../mocks/Channel';
import { MessageRouter } from '../../../src/module/message-router';
import { UserQueue } from '../../fixtures/Queues';
import { extractMetadataByDecorator } from '@hapiness/core';
import { generateMessage } from '../../mocks/Message';
import { Observable, Subscription } from 'rxjs';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { RabbitMQExt } from '../../../src/module/rabbitmq.extension';
import { ConnectionManagerMock } from '../../mocks/ConnectionManager';

// let errorHandler  = require('@hapiness/core/core').errorHandler;

@suite('- Unit InitExtension')
export class InitExtensionUnitTest {
    private ch: ChannelManager;
    private queueWrapper: QueueWrapper;
    private messageRouter: MessageRouter;
    private queue: QueueManager;
    private userQueue;

    before(done) {
        try {
            const connection = new ConnectionManagerMock();
            this.ch = new ChannelManager(connection);
            this.ch['ch'] = <any>new ChannelMock();
            this.userQueue = new UserQueue();
            this.queueWrapper = new QueueWrapper(this.userQueue, extractMetadataByDecorator(UserQueue, 'Queue'));
            this.messageRouter = new MessageRouter();
            this.queue = new QueueManager(this.ch, this.queueWrapper);
            unit.spy(this.userQueue, 'onMessage');
            done();
        } catch (err) {
            done(err);
        }
    }

    after() {
        this.ch = null;
        this.queueWrapper = null;
        this.queue = null;
        this.userQueue = null;
    }

    @test('- Should test consumeQueue when there is no message found')
    testConsumeQueue(done) {
        const spy = unit.spy(this.queue['_ch'].getChannel(), 'consume');
        unit.function(RegisterAnnotations.consumeQueue);
        RegisterAnnotations.consumeQueue(this.queue, this.messageRouter);
        unit.object(spy['firstCall']);
        unit.array(spy['firstCall']['args']);
        unit.string(spy['firstCall']['args'][0]).is('user.queue');
        unit.function(spy['firstCall']['args'][1]);
        const message = generateMessage({ foo: 'bar' }, { exchange: 'user.queue' });
        spy['firstCall']['args'][1](message);
        unit.number(this.userQueue.onMessage.callCount).is(1);
        done();
    }

    @test('- Should test consumeQueue when queue.consume() returns error <>')
    testConsumeQueueSubscribeError(done) {
        unit.function(RegisterAnnotations.consumeQueue);
        unit.stub(this.queue['_ch'].getChannel(), 'consume').returns(Promise.reject(new Error('Cannot consume queue')));
        RegisterAnnotations
            .consumeQueue(this.queue, this.messageRouter)
            .subscribe(_ => done(), err => done(err));
    }

    @test('- Should test consumeQueue when there is an error other than message not found')
    testConsumeQueueError() {
        const spy = unit.spy(this.queue['_ch'].getChannel(), 'consume');
        unit.function(RegisterAnnotations.consumeQueue);
        RegisterAnnotations.consumeQueue(this.queue, this.messageRouter);
        const stub = unit.stub(this.messageRouter, 'getDispatcher');
        stub.returns(Observable.throw(new Error('Oops, something terrible happened!')));
        const message = generateMessage({ foo: 'bar' }, { exchange: 'user.queue' });
        const obs: Subscription = spy['firstCall']['args'][1](message);
        unit.object(stub.firstCall.returnValue).isInstanceOf(ErrorObservable);
        unit
            .object(stub.firstCall.returnValue.error)
            .isInstanceOf(Error)
            .hasProperty('message', 'Oops, something terrible happened!');
        unit.bool(obs.closed).isTrue();
    }

    @test('- Should test onModuleInstantiated connection.on(error) ok')
    testonModuleInstantiatedConnectionError(done) {
        unit.function(RegisterAnnotations.bootstrap);
        const bootstrapStub = unit.stub(RegisterAnnotations, 'bootstrap');
        bootstrapStub.returns(Observable.of(null));
        const connection = new ConnectionManagerMock();
        const instance = new RabbitMQExt();
        unit.function(instance.onModuleInstantiated);
        instance.onModuleInstantiated(<any>null, connection);
        const connectStub = unit.stub(connection, 'connect');
        connectStub.returns(
            Observable.of(null)
                .do(() => {
                    unit.number(bootstrapStub.callCount).is(1);
                    bootstrapStub.restore();
                })
                .catch(err => done(err))
                .map(() => done())
        );
        connection.emit('error', new Error('Woops'));
    }

    @test('- Should test onModuleInstantiated connection.on(error) nok')
    testonModuleInstantiatedConnectionErrorNOK(done) {
        unit.function(RegisterAnnotations.bootstrap);
        const bootstrapStub = unit.stub(RegisterAnnotations, 'bootstrap');
        bootstrapStub.returns(Observable.of(null));
        const connection = new ConnectionManagerMock();
        const instance = new RabbitMQExt();
        unit.function(instance.onModuleInstantiated);
        instance.onModuleInstantiated(<any>null, connection);
        const connectStub = unit.stub(connection, 'connect');
        connectStub.returns(
            Observable.of(null)
                .flatMap(() => {
                    unit.number(bootstrapStub.callCount).is(1);
                    bootstrapStub.restore();
                    return Observable.throw(new Error('Woops'));
                })
                .catch(() => done())
        );
        connection.emit('error', new Error('Woops'));
    }

    @test('- Should test error on consumeQueue')
    testConsumeError(done) {
        const queueStub = {
            getName: () => 'hello',
            consume: () => Observable.throw(new Error('Cannot consume'))
        };
        RegisterAnnotations.consumeQueue(<any>queueStub, <any>{})
        .subscribe((_) => done(), err => done(err));
    }
}

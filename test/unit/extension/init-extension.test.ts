import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';
import { InitExtension } from '../../../src/InitExtension';
import { QueueManager, QueueWrapper } from '../../../src/managers';
import { ChannelMock } from '../../mocks/Channel';
import { Channel } from 'amqplib';
import { MessageRouter } from '../../../src/MessageRouter';
import { UserQueue } from '../../fixtures/Queues';
import { extractMetadataByDecorator } from '@hapiness/core/core';
import { generateMessage } from '../../mocks/Message';
import { Observable, Subscription } from 'rxjs';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { RabbitMQExt } from '../../../src/extension';
import { ConnectionManagerMock } from '../../mocks/ConnectionManager';

@suite('- Unit InitExtension')
export class InitExtensionUnitTest {
    private ch: Channel;
    private queueWrapper: QueueWrapper;
    private messageRouter: MessageRouter;
    private queue: QueueManager;

    before() {
        this.ch = <any>new ChannelMock();
        this.queueWrapper = new QueueWrapper(new UserQueue(), extractMetadataByDecorator(UserQueue, 'Queue'));
        this.messageRouter = new MessageRouter();
        this.queue = new QueueManager(this.ch, this.queueWrapper);
        unit.spy(this.queue['ch'], 'consume');
        unit.spy(this.queue, 'consume');
    }

    after() {
        this.ch = null;
        this.queueWrapper = null;
        this.queue = null;
    }

    @test('- Should test consomeQueue when there is no message found')
    testConsumeQueue() {
        unit.function(InitExtension['_consumeQueue']);
        InitExtension['_consumeQueue'](this.queue, this.messageRouter);
        unit.object(this.queue['ch']['consume']['firstCall']);
        unit.array(this.queue['ch']['consume']['firstCall']['args']);
        unit.string(this.queue['ch']['consume']['firstCall']['args'][0]).is('user.queue');
        unit.function(this.queue['ch']['consume']['firstCall']['args'][1]);
        const message = generateMessage({ foo: 'bar' }, { exchange: 'user.queue' });
        this.queue['ch']['consume']['firstCall']['args'][1](message);
    }

    @test('- Should test consomeQueue when there is an error other than message not found')
    testConsumeQueueError() {
        unit.function(InitExtension['_consumeQueue']);
        InitExtension['_consumeQueue'](this.queue, this.messageRouter);
        const stub = unit.stub(this.messageRouter, 'dispatch');
        stub.returns(Observable.throw(new Error('Oops, something terrible happened!')));
        const message = generateMessage({ foo: 'bar' }, { exchange: 'user.queue' });
        const obs: Subscription = this.queue['ch']['consume']['firstCall']['args'][1](message);
        unit.object(stub.firstCall.returnValue).isInstanceOf(ErrorObservable);
        unit
            .object(stub.firstCall.returnValue.error)
            .isInstanceOf(Error)
            .hasProperty('message', 'Oops, something terrible happened!');
        unit.bool(obs.closed).isTrue();
    }

    @test('- Should test onModuleInstantiated connection.on(error) ok')
    testonModuleInstantiatedConnectionError(done) {
        unit.function(InitExtension.bootstrap);
        const bootstrapStub = unit.stub(InitExtension, 'bootstrap');
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
        unit.function(InitExtension.bootstrap);
        const bootstrapStub = unit.stub(InitExtension, 'bootstrap');
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
}

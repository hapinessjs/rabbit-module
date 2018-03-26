import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import { MessageStore } from '../../../src/module/managers';
import { ConnectionManagerMock } from '../../mocks/ConnectionManager';
import { ChannelMock } from '../../mocks/Channel';

@suite('- Unit MessageStore')
export class MessageStoreTest {
    private ch: ChannelMock;
    private connection: ConnectionManagerMock;

    before() {
        this.ch = new ChannelMock();
        this.connection = new ConnectionManagerMock();
    }

    @test('- Should test instance')
    testStore() {
        unit.function(MessageStore.addConsumer);
        unit.function(MessageStore.addMessage);
        unit.function(MessageStore.cancelShutdown);
        unit.function(MessageStore.getConsumerTags);
        unit.function(MessageStore.getMessages);
        unit.function(MessageStore.hashMessages);
        unit.function(MessageStore.isShutdownRunning);
        unit.function(MessageStore.remove);
        unit.function(MessageStore.shutdown);

        unit.bool(MessageStore.hashMessages()).isFalse();
        MessageStore.addConsumer(<any>this.ch, 'consumer-1');
        MessageStore.addConsumer(<any>this.ch, 'consumer-2');
        MessageStore.addMessage(<any>{ uuid: 1 });
        MessageStore.addMessage(<any>{ uuid: 2 });
        MessageStore.addMessage(<any>{ uuid: 3 });
        MessageStore.addMessage(<any>{ uuid: 4 });
        unit.bool(MessageStore.hashMessages()).isTrue();
        unit.array(MessageStore.getConsumerTags());
        unit.array(MessageStore.getMessages()).hasLength(4);
    }

    @test('- Shutdown')
    testShutdown(done) {
        MessageStore.shutdown(this.connection)
            .subscribe(() => done(), err => done(err));

        setTimeout(() => {
            MessageStore.remove(<any>{ uuid: 2 });
            MessageStore.remove(<any>{ uuid: 3 });
        }, 500);

        setTimeout(() => {
            MessageStore.remove(<any>{ uuid: 1 });
            MessageStore.remove(<any>{ uuid: 4 });
        }, 1250);

        unit.exception(() => MessageStore.remove(<any>{}));
    }

    @test('- Cancel Shutdown')
    cancelShutdown(done) {
        unit.bool(MessageStore.isShutdownRunning()).isFalse();
        MessageStore.addConsumer(<any>this.ch, 'consumer-1');
        MessageStore.addMessage(<any>{ uuid: 4 });
        MessageStore.shutdown(this.connection).subscribe(() => done(), err => done(err));

        // Trigger debug already running
        MessageStore.shutdown(this.connection).subscribe(() => {}, err => {});

        unit.bool(MessageStore.isShutdownRunning()).isTrue();
        setTimeout(() => {
            MessageStore.cancelShutdown();
            unit.bool(MessageStore.isShutdownRunning()).isFalse();
        }, 500);
    }

    @test('- Shutdown timeout')
    shutdownTimeout(done) {
        MessageStore['shutdownTimeoutMs'] = 500;
        MessageStore.addConsumer(<any>this.ch, 'consumer-1');
        MessageStore.addMessage(<any>{ uuid: 4 });
        MessageStore.shutdown(this.connection).subscribe(() => done(new Error('Cannot succeed')), err => done());
        setTimeout(() => {
            MessageStore.remove(<any>{ uuid: 4 });
        }, 501);
    }

    @test('- Shutdown w/o consumers')
    shutdownWOConsumers(done) {
        MessageStore
            .shutdown(this.connection)
            .subscribe(() => done(), err => done(err));
    }

    @test('- Shutdown w/o messages')
    shutdownWOMessages(done) {
        MessageStore.addConsumer(<any>this.ch, 'consumer-1');
        MessageStore.addConsumer(<any>this.ch, 'consumer-2');
        MessageStore
            .shutdown(this.connection)
            .subscribe(() => done(), err => done(err));
    }
}

import * as unit from 'unit.js';
import { test, suite } from 'mocha-typescript';

import { HapinessModule, OnStart, Hapiness } from '@hapiness/core';
import { RabbitMQExt } from '../../src/module/rabbitmq.extension';

import { RabbitMQModule } from '../../src/module';
import { RabbitConnectionService } from '../../src/module/services';
import { ConnectionManagerMock } from '../mocks/ConnectionManager';
import { Config } from '@hapiness/config';
import { MessageStore } from '../../src/module/managers';
import { ChannelMock } from '../mocks/Channel';

@suite('- Integration test of RabbitMQ Shutdown feature')
export class RabbitMQShutdownTest {
    @test('- Test shutdown')
    testShutdown(done) {
        @HapinessModule({
            version: '1.0.0',
            declarations: [],
            providers: [],
            exports: [],
            imports: [RabbitMQModule]
        })
        class RabbitMQModuleTest implements OnStart {
            constructor(
                private _connectionService: RabbitConnectionService
            ) {}

            onStart() {
                unit.object(this._connectionService).isInstanceOf(RabbitConnectionService);
                unit.object(this._connectionService.connectionManager);
                unit.string(this._connectionService.connectionManager.uri).is('amqp://localhost:5672');
                unit.object(this._connectionService.connection);

                // Add one message into the store
                MessageStore.addConsumer(<any>new ChannelMock(), 'consumer-1');
                MessageStore['messages'] = [];
                const { uuid } = MessageStore.addMessage(<any>{});

                // Get extension and call onShutdown
                const extension = Hapiness['extensions'].find(ext => ext.token === RabbitMQExt);
                extension.instance.onShutdown(<any>{}, extension.value).resolver.subscribe(() => done(), err => done(err));

                setTimeout(() => {
                    MessageStore.remove(<any>{ uuid });
                }, 500);
            }

            onError(err) {}
        }

        Hapiness.bootstrap(RabbitMQModuleTest, [
            RabbitMQExt.setConfig({
                connection: Config.get('rabbitmq')
            })
        ]).catch(err => done(err));
    }
}

RabbitMQExt.ConnectionManager = ConnectionManagerMock;

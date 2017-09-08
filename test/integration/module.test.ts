import * as unit from 'unit.js';
import { test, suite } from 'mocha-typescript';

import { HapinessModule, OnStart, Hapiness } from '@hapiness/core';
import { RabbitMQExt } from '../../src/extension';

import {
    UserCreatedMessage,
    UserDeletedMessage,
    GeneratePdf,
    OrderCreatedMessage,
    FallbackMessage,
    PokemonsMessage
} from '../fixtures/Messages';
import { MayonaiseService } from '../fixtures/Services';
import { AnotherQueue, UserQueue, WorkerQueue } from '../fixtures/Queues';
import { EventsExchange, UserExchange } from '../fixtures/Exchanges';
import { RabbitMQModule } from '../../src/module';
import { RabbitConnectionService } from '../../src/services';
import { ConnectionManagerMock } from '../mocks/ConnectionManager';
// import { ConnectionManager } from './../../src/managers';

@suite('- Integration test of RabbitMQ Module')
export class RabbitMQIntegrationTest {
    @test('- Test module integration')
    testModule(done) {
        @HapinessModule({
            version: '1.0.0-rc.7.0',
            declarations: [
                UserCreatedMessage,
                UserDeletedMessage,
                GeneratePdf,
                OrderCreatedMessage,
                FallbackMessage,
                PokemonsMessage,
                UserExchange,
                EventsExchange,
                WorkerQueue,
                UserQueue,
                AnotherQueue
            ],
            providers: [MayonaiseService],
            exports: [],
            imports: [RabbitMQModule]
        })
        class RabbitMQModuleTest implements OnStart {
            constructor(private _connectionService: RabbitConnectionService) {}

            onStart() {
                unit.object(this._connectionService).isInstanceOf(RabbitConnectionService);
                unit.object(this._connectionService.connectionManager);
                unit.string(this._connectionService.connectionManager['uri']);
                unit.object(this._connectionService.connection);
                done();
            }

            onError(err) {}
        }

        Hapiness.bootstrap(RabbitMQModuleTest, [
            RabbitMQExt.setConfig({
                connection: {
                    host: 'localhost',
                    vhost: '/my_vhost',
                    login: 'username',
                    password: '*********'
                }
            })
        ]).catch(err => done(err));
    }
}

RabbitMQExt.ConnectionManager = ConnectionManagerMock;
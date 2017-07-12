import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';


import * as config from 'config';
import { HapinessModule, OnStart, Hapiness } from '@hapiness/core';
import { RabbitMQExt } from '../../src/extension';
import { ConnectionManager } from '../../src/managers/ConnectionManager';


import { UserCreatedMessage, UserDeletedMessage, GeneratePdf, OrderCreatedMessage } from '../fixtures/Messages';
import { MayonaiseService } from '../fixtures/Services';
import { AnotherQueue, UserQueue, WorkerQueue } from "../fixtures/Queues";
import { EventsExchange, UserExchange } from "../fixtures/Exchanges";
import { RabbitMQModule } from "../../src/module";
import { ConnectionService } from "../../src/services/Connection";

@suite('- Integration test of RabbitMQ Module')
class RabbitMQIntegrationTest {

    @test('- Test module')
    testModule(done) {
        @HapinessModule({
            version: '1.0.0-rc.7.0',
            declarations: [
                UserCreatedMessage,
                UserDeletedMessage,
                AnotherQueue,
                EventsExchange,
                GeneratePdf,
                OrderCreatedMessage,
                UserExchange,
                UserQueue,
                WorkerQueue
            ],
            providers: [
                MayonaiseService
            ],
            exports: [],
            imports: [RabbitMQModule]
        })
        class RabbitMQModuleTest implements OnStart {

            constructor(private _connectionService: ConnectionService) {}

            onStart() {
                console.log(this._connectionService);
                done();
            }

        }

        Hapiness.bootstrap(RabbitMQModuleTest, [
            RabbitMQExt.setConfig({
                host: 'tdw01.dev01.in.tdw',
                vhost: 'hapiness_antoine',
                login: 'tadaweb',
                password: 'tadaweb'
            })
        ]);
    }
}

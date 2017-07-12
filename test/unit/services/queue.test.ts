import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import { Observable } from 'rxjs/Observable';
import { ChannelMock } from "../../mocks/Channel";
import { QueueManager } from '../../../src/managers/QueueManager';
import { ConnectionServiceMock } from "../../mocks/ConnectionService";
import { ChannelService } from "../../../src/services/Channel";
import { QueueService } from "../../../src/services/Queue";

@suite('- Unit QueueService')
class ConnectTest {

    @test('- Should test new instance')
    testNew(done) {
        const connectionService = new ConnectionServiceMock();
        const channelService = new ChannelService(<any>connectionService);
        const instance = new QueueService(channelService);
        instance
            .factory({ channel: 'default', queue: { name: 'test.queue' } })
            .subscribe(manager => {
                unit.object(manager).isInstanceOf(QueueManager);
                unit.value(manager.getName()).is('test.queue');
                done();
            });
    }

}



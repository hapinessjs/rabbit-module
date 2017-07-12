import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import { Observable } from 'rxjs/Observable';
import { ChannelMock } from "../../mocks/Channel";
import { ExchangeType, ExchangeManager } from '../../../src/managers/ExchangeManager';
import { ConnectionServiceMock } from "../../mocks/ConnectionService";
import { ChannelService } from "../../../src/services/Channel";
import { ExchangeService } from "../../../src/services/Exchange";

@suite('- Unit ExchangeService')
class ConnectTest {

    @test('- Should test new instance')
    testNew(done) {
        const connectionService = new ConnectionServiceMock();
        const channelService = new ChannelService(<any>connectionService);
        const instance = new ExchangeService(channelService);
        instance
            .factory({ channel: 'default', exchange: { name: 'test.exchange', type: ExchangeType.Direct } })
            .subscribe(manager => {
                unit.object(manager).isInstanceOf(ExchangeManager);
                unit.value(manager.getName()).is('test.exchange');
                done();
            });
    }

}



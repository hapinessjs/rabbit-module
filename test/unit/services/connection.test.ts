import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import { Observable } from 'rxjs/Observable';
import { ConnectionService, ChannelService } from "../../../src/services/index";
import { ConnectionManager, ChannelManager } from "../../../src/index";
import { ConnectionManagerMock } from "../../mocks/ConnectionManager";
import { ChannelMock } from "../../mocks/Channel";
import { RabbitConnectionMock } from "../../mocks/RabbitConnection";

@suite('- Unit ConnectionService')
class ConnectTest {
    static stub_sendMessage: any;

    @test('- Should test new instance')
    testNew() {
        const connectionManager = new ConnectionManagerMock();
        const connectionService = new ConnectionService(connectionManager);
        unit.object(connectionService);
        unit.object(connectionService.connection);
        unit.object(connectionService.connectionManager);
        unit.object(connectionService.connectionManager).isInstanceOf(ConnectionManagerMock);
        unit.object(connectionService.connection).isInstanceOf(RabbitConnectionMock);
    }

}



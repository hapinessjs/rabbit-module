import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import { RabbitConnectionService } from '../../../src/module/services';
import { ConnectionManagerMock } from '../../mocks/ConnectionManager';
import { RabbitConnectionMock } from '../../mocks/RabbitConnection';

@suite('- Unit ConnectionService')
export class ConnectionServiceUnitTest {
    static stub_sendMessage: any;

    @test('- Should test new instance')
    testNew() {
        const connectionManager = new ConnectionManagerMock();
        const connectionService = new RabbitConnectionService(connectionManager);
        unit.object(connectionService);
        unit.object(connectionService.connection);
        unit.object(connectionService.connectionManager);
        unit.object(connectionService.connectionManager).isInstanceOf(ConnectionManagerMock);
        unit.object(connectionService.connection).isInstanceOf(RabbitConnectionMock);
    }
}

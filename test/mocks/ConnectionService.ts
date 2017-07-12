import { ConnectionManager } from "../../src/index";
import { RabbitConnectionMock } from "./RabbitConnection";
import { ConnectionManagerMock } from "./ConnectionManager";
import { Connection } from "amqplib";

export class ConnectionServiceMock {
    private _connectionManager: ConnectionManagerMock;

    constructor() {
        this._connectionManager = new ConnectionManagerMock();
    }

    public get connectionManager(): ConnectionManager {
        return this._connectionManager;
    }

    public get connection(): Connection {
        return this._connectionManager.getConnection();
    }

}

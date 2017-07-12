import { ChannelManager } from '../managers/ChannelManager';
import { Injectable, Inject } from "@hapiness/core";
import { RabbitMQExt } from "../extension";
import { ConnectionManager } from "../managers/ConnectionManager";
import { Channel, Connection } from "amqplib";
import { Observable } from "rxjs";

@Injectable()
export class ConnectionService {

    private _channels = {};

    constructor(@Inject(RabbitMQExt) private _connectionManager: ConnectionManager) {}

    public get connectionManager(): ConnectionManager {
        return this._connectionManager;
    }

    public get connection(): Connection {
        return this._connectionManager.getConnection();
    }

}

import { ConnectionManager } from "../../src/index";
import { RabbitConnectionMock } from "./RabbitConnection";
import { ChannelMock } from "./Channel";

export class ConnectionManagerMock extends ConnectionManager {

    constructor() {
        super();
        this['_isConnected'] = true;
        this['connection'] = <any>new RabbitConnectionMock();
        this['defaultChannel'] = <any>new ChannelMock();
    }

}

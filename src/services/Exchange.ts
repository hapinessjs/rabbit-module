import { Injectable } from "@hapiness/core";
import { ConnectionManager } from "../managers/ConnectionManager";
import { Observable } from "rxjs";
import { ConnectionService } from "./Connection";
import { ExchangeManager, ExchangeOptions, ExchangeBase } from "../managers/ExchangeManager";
import { ChannelService } from "./Channel";
import { Connection } from "amqplib";

export interface CreateExchangeOptions {
    channel: string;
    exchange: ExchangeBase | ExchangeOptions
};

@Injectable()
export class ExchangeService {

    private _channels = {};

    constructor(private _channelService: ChannelService) {}

    public factory({ channel, exchange }: CreateExchangeOptions): Observable<ExchangeManager> {
        return this._channelService.upsert({ key: channel }).map(ch => {
            return new ExchangeManager(ch.getChannel(), exchange);
        });
    }
}

import { Injectable } from "@hapiness/core";
import { ConnectionManager } from "../managers/ConnectionManager";
import { Observable } from "rxjs";
import { ConnectionService } from "./Connection";
import { ChannelService } from "./Channel";
import { Connection } from "amqplib";
import { QueueManager, QueueOptions, QueueBase } from "../managers/QueueManager";

export interface CreateQueueOptions {
    channel: string;
    queue: QueueBase | QueueOptions
};

@Injectable()
export class QueueService {

    private _channels = {};

    constructor(private _channelService: ChannelService) {}

    public factory({ channel, queue }: CreateQueueOptions): Observable<QueueManager> {
        return this._channelService.upsert({ key: channel }).map(ch => {
            return new QueueManager(ch.getChannel(), queue);
        });
    }
}

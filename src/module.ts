import * as config from 'config';
import { HapinessModule } from '@hapiness/core';
import { ExchangeManager } from './managers/ExchangeManager';
import { QueueManager } from './managers/QueueManager';
import { ChannelManager } from './managers/ChannelManager';
import { ConnectionManager } from './managers/ConnectionManager';
import { ChannelService, ConnectionService, ExchangeService, QueueService } from './services';

@HapinessModule({
    version: '1.0.0-rc.7.0',
    declarations: [],
    providers: [],
    exports: [
        ChannelService,
        ConnectionService,
        ExchangeService,
        QueueService
    ],
    imports: []
})
export class RabbitMQModule {}

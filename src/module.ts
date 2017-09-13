import { HapinessModule } from '@hapiness/core';
import { ChannelService, RabbitConnectionService } from './services';
import { MessageService } from './services/message.service';

@HapinessModule({
    version: '1.0.0-rc.7.0',
    declarations: [],
    providers: [],
    exports: [RabbitConnectionService, ChannelService, MessageService],
    imports: []
})
export class RabbitMQModule {}

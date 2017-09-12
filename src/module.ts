import { HapinessModule } from '@hapiness/core';
import { ChannelService, RabbitConnectionService } from './services';

@HapinessModule({
    version: '1.0.0-rc.7.0',
    declarations: [],
    providers: [],
    exports: [RabbitConnectionService, ChannelService],
    imports: []
})
export class RabbitMQModule {}

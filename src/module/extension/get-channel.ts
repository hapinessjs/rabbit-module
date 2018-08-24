import { ConnectionManager } from '../managers/connection-manager';
import { ChannelOptions } from '../decorators';
import { Observable } from 'rxjs/Observable';
import { ChannelManager } from '../managers/channel-manager';

export function getChannel(connection: ConnectionManager, channel: ChannelOptions): Observable<ChannelManager> {
    return connection
        .channelStore
        .upsert(channel.key, { prefetch: channel.prefetch, global: channel.global });
}

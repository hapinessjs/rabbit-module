import { ConnectionManager } from '../managers/connection-manager';
import { Observable } from 'rxjs/Observable';
import { ChannelManager } from '../managers/channel-manager';
import { ChannelOptions } from '../interfaces';

export function getChannel(connection: ConnectionManager, channel: ChannelOptions): Observable<ChannelManager> {
    return connection
        .channelStore
        .upsert(channel.key, { prefetch: channel.prefetch, global: channel.global });
}

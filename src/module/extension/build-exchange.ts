import { Observable } from 'rxjs/Observable';
import { CoreModule, DependencyInjection } from '@hapiness/core';
import { ConnectionManager } from '../managers/connection-manager';
import { metadataFromDeclarations } from '../utils';
import { ExchangeDecoratorInterface } from '../decorators';
import { ExchangeManager } from '../managers/exchange-manager';
import { ExchangeWrapper } from '../managers/exchange-wrapper';

export default function buildExchanges(modules: CoreModule[], connection: ConnectionManager): Observable<any> {
    return Observable.from(modules)
        .filter(_module => !!_module)
        .flatMap(_module =>
            metadataFromDeclarations<ExchangeDecoratorInterface>(_module.declarations, 'Exchange')
                .map(metadata => ({ metadata, _module }))
        )
        .flatMap(({ metadata, _module }) => DependencyInjection.instantiateComponent(metadata.token, _module.di)
            .map(instance => ({ instance, _module, metadata })))
        .flatMap(({ instance, _module, metadata }) => {
            const exchange = new ExchangeManager(connection.defaultChannel, new ExchangeWrapper(instance, metadata.data));
            return exchange.assert();
        })
        .toArray();
}

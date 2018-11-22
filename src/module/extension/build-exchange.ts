import { Observable } from 'rxjs/Observable';
import { CoreModule } from '@hapiness/core';
import { ConnectionManager } from '../managers/connection-manager';
import { metadataFromDeclarations, instantiateWithProviders } from '../utils';
import { ExchangeDecoratorInterface } from '../decorators';
import { ExchangeManager } from '../managers/exchange-manager';
import { ExchangeWrapper } from '../managers/exchange-wrapper';
import { RabbitMQExt } from '../rabbitmq.extension';

export default function buildExchanges(modules: CoreModule[], connection: ConnectionManager): Observable<any> {
    return Observable.from(modules)
        .filter(_module => !!_module)
        .flatMap(_module =>
            metadataFromDeclarations<ExchangeDecoratorInterface>(_module.declarations, 'Exchange')
                .map(metadata => ({ metadata, _module }))
        )
        .flatMap(({ metadata, _module }) => instantiateWithProviders(metadata.token, metadata.data.providers, _module)
            .map(instance => ({ instance, _module, metadata })))
        .flatMap(({ instance, _module, metadata }) => {
            const exchange = new ExchangeManager(connection.defaultChannel, new ExchangeWrapper(instance, metadata.data));
            // Don't check queue if we assert it
            const shouldAssert = typeof metadata.data.assert === 'boolean' ? metadata.data.assert : RabbitMQExt.getConfig().assert;
            const assertOrCheck$ = shouldAssert
                ? exchange.assert().map(() => exchange)
                : metadata.data.check ? exchange.check().map(() => exchange) : Observable.of(exchange);
            return assertOrCheck$;
        })
        .toArray();
}

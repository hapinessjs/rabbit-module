import { CoreModule, Type, extractMetadataByDecorator, DependencyInjection } from '@hapiness/core';
import { Observable } from 'rxjs/Observable';

export const getModules = (module: CoreModule): CoreModule[] => {
    const lookup = (_module: CoreModule) => {
        return []
            .concat(_module)
            .concat([]
                .concat(_module && _module.modules)
                .filter(_ => !!_)
                .map(m => lookup(m))
                .reduce((a, c) => a.concat(c), [])
            );
    };
    return lookup(module);
};

export function metadataFromDeclarations<T>(declarations: Type<any>[], decoratorName) {
    return Observable.from([].concat(declarations))
        .filter(_ => !!_ && !!extractMetadataByDecorator(_, decoratorName))
        .map(_ => ({
            token: _,
            data: extractMetadataByDecorator<T>(_, decoratorName)
        }));
}

export function instantiateWithProviders<T = any>(token: any, providers: any[], module): Observable<T> {
    return DependencyInjection.createAndResolve([].concat(providers), module.di)
        .flatMap(di => DependencyInjection.instantiateComponent(token, di));
}

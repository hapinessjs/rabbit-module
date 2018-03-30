import { CoreModule } from '@hapiness/core';

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

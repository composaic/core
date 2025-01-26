import { PluginDescriptor } from '../plugins/types.js';
import loggerPluginDef from '../plugins/impl/logger/logger-plugin.json';
import signalsPluginDef from '../plugins/impl/signals/signals-plugin.json';

import * as logger from '../plugins/impl/logger/index.js';
import * as signals from '../plugins/impl/signals/index.js';

const pluginsMap = {
    [loggerPluginDef.package + '/' + loggerPluginDef.module]: logger,
    [signalsPluginDef.package + '/' + signalsPluginDef.module]: signals,
};

export const loadSystemPlugin = async (
    pluginDescriptor: PluginDescriptor
): Promise<object | undefined> => {
    return Promise.resolve(
        pluginsMap[`${pluginDescriptor.package}/${pluginDescriptor.module}`]
    );
};

export const getSystemPluginDefinitions = (): PluginDescriptor[] => {
    return [
        { ...loggerPluginDef, loader: loadSystemPlugin } as PluginDescriptor,
        { ...signalsPluginDef, loader: loadSystemPlugin } as PluginDescriptor,
    ];
};

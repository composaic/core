import { createServices } from '../services/ServiceManager.js';
import { RemotePluginLoader } from '../services/RemotePluginLoader.js';
import {
    Configuration,
    ConfigurationService,
} from '../services/configuration.js';
import { PluginManager } from '../plugins/PluginManager.js';
import { LoggingService } from '../services/LoggingService.js';
import { RemoteModuleLoaderService } from '../services/RemoteModuleLoaderService.js';
import { LogCore, PluginDescriptor } from '../plugins/types.js';
import { getSystemPluginDefinitions } from './plugin-utils.js';

export type RemoteModule = {
    url: string;
    name: string;
    bundleFile: string;
    moduleName: string;
};

export type RemoteModuleLoaderFn = (
    remoteModule: RemoteModule
) => Promise<object | undefined>;

/**
 * PluginModule is a module (NPM etc) that provides plugins to be loaded statically at startup.
 * An example is @composaic/web which provides basic web application functionality for web apps.
 */
export type PluginModule = {
    getPluginDefinitions: () => PluginDescriptor[];
    getModuleName: () => string;
}

interface InitOptions {
    getPluginModules?: () => PluginModule[];
    addLocalPlugins?: () => void;
    config?: Configuration;
    loadRemoteModule: RemoteModuleLoaderFn;
}

export const init = async (options: InitOptions) => {
    console.log('[composaic] Booting Composaic...');
    await LoggingService.createInstance();
    LoggingService.getInstance().info({
        module: LogCore,
        message: 'Logging service initialised.',
    });
    const {
        getPluginModules,
        addLocalPlugins,
        config,
        loadRemoteModule,
    } = options;
    RemoteModuleLoaderService.initialiseStaticInstance(loadRemoteModule);
    const systemPlugins = getSystemPluginDefinitions();
    await PluginManager.getInstance().addPluginDefinitions(systemPlugins);
    
    if (getPluginModules) {
        getPluginModules().map(async (pluginModule) => {
            console.log(`[composaic] Adding plugin module ${pluginModule.getModuleName()}`);
            const definitions = pluginModule.getPluginDefinitions();
            console.log(`[composaic] Plugin definitions:`, JSON.stringify(definitions, null, 2));
            await PluginManager.getInstance().addPluginDefinitions(definitions);
        });
    }
    
    await LoggingService.createInstance(true);
    await addLocalPlugins?.();
    const configuration =
        ConfigurationService.getInstance(config).getConfiguration();
    LoggingService.getInstance().info({
        module: LogCore,
        message: `Configuration ${JSON.stringify(configuration)}`,
    });

    RemotePluginLoader.getInstance().loadManifests(configuration.remotes);

    // Create and initialize services
    createServices();

    LoggingService.getInstance().info({
        module: LogCore,
        message: `Configuration: ${JSON.stringify(ConfigurationService.getInstance().getConfiguration())}`,
    });

    LoggingService.getInstance().info({
        module: LogCore,
        message: `Initialisation done, ${PluginManager.getInstance().getNumberOfPlugins()} plugins in total`,
    });
    LoggingService.getInstance().info({
        module: LogCore,
        message: `Plugins: ${PluginManager.getInstance()
            .getPluginIds()
            .map((plugin) => plugin)
            .join(', ')}`,
    });
};

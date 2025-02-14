export { Plugin } from './plugins/types.js';
export { SignalService } from './services/SignalService.js';
export { init } from './core/init.js';
export { RemoteModule, PluginModule } from './core/init.js';
export { PluginDescriptor } from './plugins/types.js';
export {
    ConfigurationService,
    ComposaicEnv,
} from './services/configuration.js';
export { PluginManager } from './plugins/PluginManager.js';
export { Configuration } from './services/configuration.js';
export { addLocalPlugins } from './dev/plugin-utils.js';

// Plugin System Decorators
export {
    PluginMetadata,
    ExtensionMetadata,
    Metadata,
} from './plugin-system/decorators.js';

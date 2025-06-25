import {
    ClassConstructor,
    Extension,
    ExtensionPoint,
    Plugin,
    PluginDescriptor,
} from './types';

import * as bar from './impl/bar/BarPluginModule.js';
import * as baz from './impl/baz/BazPluginModule.js';
import * as foo from './impl/foo/FooPluginModule.js';
import { RemoteModuleLoaderService } from '../services/RemoteModuleLoaderService.js';
import { LoggingService } from '../services/LoggingService.js';

const pluginModule = 'plugins';

const moduleMap: { [key: string]: object } = {
    'bar/BarPluginModule': bar,
    'baz/BazPluginModule': baz,
    'foo/FooPluginModule': foo,
};

/**
 * A callback function type that is invoked when a plugin changes.
 *
 * @callback PluginChangeCallback
 * @param {string} pluginId - The unique identifier of the plugin that has changed.
 */
type PluginChangeCallback = (plugin: string) => void;

/**
 * Represents a listener for plugin changes.
 *
 * @interface PluginListener
 *
 * @property {string[]} pluginIds - An array of plugin IDs that the listener is interested in.
 * @property {PluginChangeCallback} callback - A callback function that is invoked when there is a change in the specified plugins.
 */
interface PluginListener {
    pluginIds: string[];
    callback: PluginChangeCallback;
}

interface LoadPluginOptions {
    dependingPlugin?: string;
    processManifestOnly?: boolean;
    viaGetPlugin?: boolean;
    reinitialise?: boolean;
}

interface GetPluginOptions {
    reinitialise?: boolean;
}

export const loadCorePlugin = async (
    pluginDescriptor: PluginDescriptor
): Promise<object | undefined> => {
    return Promise.resolve(
        moduleMap[`${pluginDescriptor.package}/${pluginDescriptor.module}`]
    );
};

/**
 * The `PluginManager` class is responsible for managing plugins in the application.
 * It provides methods to add, load, start, and get plugins.
 */
export class PluginManager {
    protected static instance: PluginManager;
    private registry: { [key: string]: any } = {};
    /**
     * A map of pluginID (dependency) to a collection of pluginIDs (dependent or providing extension to the dependency)
     * Whenever a plugin is loaded we will need to check this map to see if there's plugin(s) waiting for the loaded plugin if so,
     * those will need to be loaded first.
     */
    private awaitingDependency: { [key: string]: string[] } = {};
    private listeners: PluginListener[] = [];

    protected constructor() {}

    public static getInstance(): PluginManager {
        if (!PluginManager.instance) {
            PluginManager.instance = new PluginManager();
        }
        return PluginManager.instance;
    }

    /**
     * Add an array of plugin definitions to the registry
     * @param plugins - an array of plugin definitions
     */
    async addPluginDefinitions(plugins: PluginDescriptor[]) {
        plugins.map(async (plugin) => {
            LoggingService.getInstance().info({
                module: pluginModule,
                header: plugin.plugin,
                message: 'Adding plugin to registry',
            });
            const existingPlugin = this.registry[plugin.plugin];
            if (!existingPlugin) {
                this.addPlugin(plugin);
            } else {
                LoggingService.getInstance().info({
                    module: pluginModule,
                    header: plugin.plugin,
                    message: 'Already in registry, ignoring',
                });
            }
        });
    }

    /**
     * Add a plugin definition to the registry
     * @param pluginDescriptor - a plugin definition
     */
    async addPlugin(pluginDescriptor: PluginDescriptor) {
        pluginDescriptor.dependencies = [];
        if (pluginDescriptor.extensions) {
            pluginDescriptor.extensions.forEach((extension) => {
                if (extension.plugin !== 'self') {
                    const targetPluginName = extension.plugin;
                    const targetPluginDescriptor =
                        this.registry[targetPluginName];

                    if (targetPluginDescriptor) {
                        // Add this plugin as a dependency to the plugin offering the extension point
                        targetPluginDescriptor.dependencies!.push(
                            pluginDescriptor
                        );
                        // Also add the plugin offering the extension point as a dependency to this plugin
                        pluginDescriptor.dependencies!.push(
                            targetPluginDescriptor
                        );
                    } else {
                        // add plugin to awaiting list if not already there
                        if (!this.awaitingDependency[targetPluginName]) {
                            this.awaitingDependency[targetPluginName] = [];
                        }
                        if (
                            !this.awaitingDependency[targetPluginName].includes(
                                pluginDescriptor.plugin
                            )
                        ) {
                            this.awaitingDependency[targetPluginName].push(
                                pluginDescriptor.plugin
                            );
                        }
                    }
                }
            });
        }

        // Register the plugin in the registry
        this.registry[pluginDescriptor.plugin] = pluginDescriptor;
        await this.loadPlugin(pluginDescriptor.plugin, {
            processManifestOnly: true,
        });
    }

    /**
     * Load a plugin by name
     * @param pluginName - the name of the plugin to load
     * @param dependingPlugin - the name of the plugin that depends on the plugin to load
     * @param forceReload - whether to force a reload of the plugin if it is already loaded
     */
    protected async loadPlugin(
        pluginName: string,
        options: LoadPluginOptions = {}
    ): Promise<Plugin | null> {
        const {
            dependingPlugin,
            processManifestOnly = false,
            viaGetPlugin = false,
            reinitialise = false,
        } = options;
        const pluginDescriptor = this.registry[pluginName];
        if (!pluginDescriptor) {
            LoggingService.getInstance().warn({
                module: pluginModule,
                header: pluginName,
                message: 'plugin not found',
            });
        }
        if (pluginDescriptor.pluginInstance && !reinitialise) {
            LoggingService.getInstance().info({
                module: pluginModule,
                header: pluginName,
                message: `plugin already loaded`,
            });
            return pluginDescriptor.pluginInstance;
        }
        if (reinitialise) {
            LoggingService.getInstance().info({
                module: pluginModule,
                header: pluginName,
                message: `reinitialising plugin`,
            });
            pluginDescriptor.pluginInstance = null;
        }
        const deferred =
            pluginDescriptor.load === 'deferred' && !!dependingPlugin;

        // This is interesting - don't we have the reinitialise flag for this? So now it seems we always reinitialise the plugin
        // we can no longer just return, as we might need to finish loading a plugin that needs to offer extensions (awaiting plugin situation)
        // if (pluginDescriptor.pluginInstance) {
        //     return pluginDescriptor.pluginInstance;
        // }

        // load plugins that have extensions for this plugin but were added prior to this plugin
        const awaitingThisPlugin =
            this.awaitingDependency[pluginDescriptor.plugin];
        if (awaitingThisPlugin) {
            for (const awaitingPlugin of awaitingThisPlugin) {
                LoggingService.getInstance().info({
                    module: pluginModule,
                    header: pluginDescriptor.plugin,
                    message: `Loading plugin ${awaitingPlugin} that was awaiting plugin ${pluginDescriptor.plugin}`,
                });
                await this.loadPlugin(awaitingPlugin, {
                    processManifestOnly,
                });
            }
            // remove plugins that were awaiting this plugin
            this.awaitingDependency[pluginDescriptor.plugin] = [];
        }

        // load plugins that this plugin depends on
        if (pluginDescriptor.dependencies) {
            const dependencyPromises = pluginDescriptor.dependencies.map(
                (dependency: PluginDescriptor) => {
                    const pluginToLoad = (dependency as PluginDescriptor)
                        .plugin;
                    if (pluginToLoad === dependingPlugin) {
                        return Promise.resolve(); // Skip self-dependency
                    }

                    // check if target plugin is available in the registry
                    // it might not have been added yet if it is a remote plugin
                    if (!this.registry[pluginToLoad]) {
                        LoggingService.getInstance().info({
                            module: pluginModule,
                            header: pluginName,
                            message: `Dependency with ID ${pluginToLoad} not found in registry, delaying loading of plugin ${pluginName}`,
                        });
                        // remember that for the target plugin we are going to have to reload this plugin once again
                        // we might be able to do this in a more efficient way by only setting the extensions (which are already loaded)
                        // for the target plugin when that has become available
                        // reason for this is that even if none of the dependencies are available, this plugin will still keeps loading and
                        // it's extensions will be initialised and ready for use
                        if (!this.awaitingDependency[pluginToLoad]) {
                            this.awaitingDependency[pluginToLoad] = [];
                        }
                        this.awaitingDependency[pluginToLoad].push(
                            pluginDescriptor.plugin
                        );
                        return Promise.reject(
                            new Error(
                                `Dependency ${pluginToLoad} not found in registry`
                            )
                        );
                    } else {
                        return this.loadPlugin(
                            (dependency as PluginDescriptor).plugin,
                            {
                                dependingPlugin: pluginDescriptor.plugin,
                                processManifestOnly,
                            }
                        );
                    }
                }
            );

            const results = await Promise.allSettled(dependencyPromises);
            // Log any failed dependencies but continue with plugin loading
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    const dependency = pluginDescriptor.dependencies![
                        index
                    ] as PluginDescriptor;
                    LoggingService.getInstance().info({
                        module: pluginModule,
                        header: pluginName,
                        message: `Failed to load dependency ${dependency.plugin}: ${result.reason}`,
                    });
                }
            });
        }
        if (deferred) {
            LoggingService.getInstance().info({
                module: pluginModule,
                header: pluginName,
                message: `load is defined as 'deferred' so not loading plugin`,
            });
        } else {
            if (!pluginDescriptor.loadedModule && !processManifestOnly) {
                try {
                    LoggingService.getInstance().info({
                        module: pluginModule,
                        header: pluginDescriptor.plugin,
                        message: `loading plugin module START`,
                    });
                    pluginDescriptor.loadedModule =
                        await pluginDescriptor.loader(pluginDescriptor);
                    LoggingService.getInstance().info({
                        module: pluginModule,
                        header: pluginDescriptor.plugin,
                        message: `loading plugin module DONE`,
                    });
                } catch (error) {
                    LoggingService.getInstance().info({
                        module: pluginModule,
                        header: pluginDescriptor.plugin,
                        message: `loading plugin module FAILED`,
                    });
                    return null;
                }
            }
            if (pluginDescriptor.loadedModule) {
                pluginDescriptor.loadedClass =
                    pluginDescriptor.loadedModule![
                        pluginDescriptor.class as keyof typeof pluginDescriptor.loadedModule
                    ];
            }
        }
        if (pluginDescriptor.extensions) {
            for (const extension of pluginDescriptor.extensions) {
                if (!deferred && !processManifestOnly) {
                    if (!extension.impl) {
                        // if this is a reload dont recreate the extension impl
                        const ExtensionImpl = pluginDescriptor.loadedModule![
                            extension.className as keyof typeof pluginDescriptor.loadedModule
                        ] as ClassConstructor;
                        extension.impl = new ExtensionImpl();
                    }
                }
                const targetPlugin =
                    extension.plugin === 'self'
                        ? pluginDescriptor
                        : this.registry[extension.plugin];
                if (!targetPlugin) {
                    LoggingService.getInstance().info({
                        module: pluginModule,
                        header: pluginName,
                        message: `plugin with ID ${extension.plugin} not found for extension ${extension.id}`,
                    });
                    continue;
                }
                // look up the extension point in the targetPlugin matching the extension.id
                const extensionPoint = targetPlugin.extensionPoints!.find(
                    (ep: any) => ep.id === extension.id
                );
                // add the extension.impl into the targetPlugins's extensionPoint.impl array initialising it if necessary
                if (extensionPoint) {
                    if (!extensionPoint!.impl) {
                        extensionPoint!.impl = [];
                    }

                    // Find and replace or add new extension
                    const existingIndex: number =
                        extensionPoint.impl!.findIndex(
                            (ext: { plugin: string }) =>
                                ext.plugin === pluginDescriptor.plugin
                        );
                    if (existingIndex !== -1) {
                        // Replace existing extension
                        extensionPoint.impl![existingIndex] = {
                            plugin: pluginDescriptor.plugin,
                            extensionImpl: extension.impl,
                            meta: extension.meta,
                        };
                    } else {
                        // Add new extension
                        extensionPoint.impl!.push({
                            plugin: pluginDescriptor.plugin,
                            extensionImpl: extension.impl,
                            meta: extension.meta,
                        });
                    }

                    // Only notify listeners once the plugin has been loaded
                    if (
                        extension.plugin !== 'self' &&
                        targetPlugin.pluginInstance
                    ) {
                        setTimeout(() => {
                            // need to restart the plugin so it picks up stuff from new extension!
                            if (this.registry[extension.plugin]) {
                                const targetPluginDescriptor =
                                    this.registry[extension.plugin];

                                // FIRST: Refresh extension connections with updated data
                                targetPluginDescriptor.extensionPoints?.forEach(
                                    (extensionPoint: ExtensionPoint) => {
                                        targetPluginDescriptor.pluginInstance.connectExtensions(
                                            extensionPoint.id,
                                            extensionPoint.impl!
                                        );
                                    }
                                );

                                // THEN: Restart the plugin
                                targetPluginDescriptor.pluginInstance?.start();
                            }
                            LoggingService.getInstance().info({
                                module: pluginModule,
                                header: pluginDescriptor.plugin,
                                message: `notifying listeners (change in connected extensions)`,
                            });
                            this.notifyPluginChanged(extension.plugin);
                        }, 0);
                    }
                } else {
                    LoggingService.getInstance().info({
                        module: pluginModule,
                        header: pluginDescriptor.plugin,
                        message: `extension point not found ${targetPlugin.plugin}:${extension.id}`,
                    });
                }
            }
        }

        if (!(deferred || processManifestOnly)) {
            if (!pluginDescriptor.pluginInstance) {
                const PluginClass =
                    pluginDescriptor.loadedClass! as ClassConstructor;
                const plugin = new PluginClass();
                pluginDescriptor.pluginInstance = plugin as Plugin;
            }

            pluginDescriptor.extensionPoints?.forEach(
                (extensionPoint: ExtensionPoint) => {
                    pluginDescriptor.pluginInstance.connectExtensions(
                        extensionPoint.id,
                        extensionPoint.impl!
                    );
                }
            );

            pluginDescriptor.extensions?.forEach((extension: Extension) => {
                pluginDescriptor.pluginInstance.setExtensionImplementation(
                    extension.plugin,
                    extension.id,
                    extension.impl!
                );
            });
            pluginDescriptor.pluginInstance.init(pluginDescriptor);
        }
        if (!viaGetPlugin && !processManifestOnly) {
            LoggingService.getInstance().info({
                module: pluginModule,
                header: pluginDescriptor.plugin,
                message: `notifying listeners for change for plugin`,
            });
            this.notifyPluginChanged(pluginDescriptor.plugin);
        }
        // don't notify listeners for deferred plugins only when they're loaded
        return pluginDescriptor.pluginInstance;
    }

    async loadRemotePluginModule(
        url: string,
        name: string,
        bundleFile: string,
        moduleName: string
    ): Promise<object | undefined> {
        return RemoteModuleLoaderService.getInstance().loadRemoteModule({
            url,
            name,
            bundleFile,
            moduleName,
        });
    }

    protected async startPlugin(plugin: Plugin, dependingPlugin?: Plugin) {
        LoggingService.getInstance().info({
            module: pluginModule,
            header: plugin.pluginDescriptor.plugin,
            message: `starting plugin`,
        });
        if (plugin.started) {
            LoggingService.getInstance().info({
                module: pluginModule,
                header: plugin.pluginDescriptor.plugin,
                message: `plugin already started`,
            });
            return;
        }
        if (plugin.pluginDescriptor.dependencies) {
            Promise.allSettled(
                plugin.pluginDescriptor.dependencies.map(async (dependency) => {
                    if ((dependency as PluginDescriptor).load === 'deferred') {
                        LoggingService.getInstance().info({
                            module: pluginModule,
                            header: plugin.pluginDescriptor.plugin,
                            message: `deferring starting of dependency plugin with load=deferred ${(dependency as PluginDescriptor).plugin}`,
                        });
                    } else {
                        const pluginToLoad = (dependency as PluginDescriptor)
                            .plugin;
                        if (
                            pluginToLoad !==
                            dependingPlugin?.pluginDescriptor.plugin
                        ) {
                            await this.startPlugin(
                                (dependency as PluginDescriptor)
                                    .pluginInstance!,
                                plugin
                            );
                        }
                    }
                })
            );
        }
        await plugin.start();
        LoggingService.getInstance().info({
            module: pluginModule,
            header: plugin.pluginDescriptor.plugin,
            message: `plugin started`,
        });
    }

    /**
     * Get a plugin by name
     *
     * @param pluginName
     * @returns the plugin instance. If the plugin is not loaded, it will be loaded.
     */
    async getPlugin(
        pluginName: string,
        options: GetPluginOptions = {}
    ): Promise<Plugin | undefined> {
        const { reinitialise = false } = options;
        LoggingService.getInstance().debug({
            module: pluginModule,
            header: pluginName,
            message: `Retrieve plugin, reinitialise=${reinitialise})`,
        });
        try {
            const pluginDescriptor = this.registry[pluginName];
            if (!pluginDescriptor) {
                LoggingService.getInstance().warn({
                    module: pluginModule,
                    header: pluginName,
                    message: 'Plugin not found',
                });
            } else {
                if (!pluginDescriptor.pluginInstance || reinitialise) {
                    await this.loadPlugin(pluginName, {
                        viaGetPlugin: true,
                        reinitialise,
                    });
                }
                if (!pluginDescriptor.pluginInstance.started) {
                    await this.startPlugin(pluginDescriptor.pluginInstance!);
                }
            }
            return pluginDescriptor?.pluginInstance!;
        } catch (error) {
            LoggingService.getInstance().error({
                module: pluginModule,
                header: pluginName,
                message: `error getting plugin: ${error}`,
            });
            throw error;
        }
    }

    clear() {
        this.registry = {};
        this.awaitingDependency = {};
        this.listeners = [];
    }

    getNumberOfPlugins(): number {
        return Object.keys(this.registry).length;
    }

    getPluginIds(): string[] {
        return Object.keys(this.registry);
    }

    /**
     * Registers a listener for plugin change events.
     *
     * @param pluginIds - An array of plugin IDs to listen for changes.
     * @param callback - A callback function to be invoked when any of the specified plugins change.
     * @returns A function to unsubscribe the listener.
     */
    public registerPluginChangeListener(
        pluginIds: string[],
        callback: PluginChangeCallback
    ): () => void {
        const listener: PluginListener = {
            pluginIds,
            callback,
        };
        this.listeners.push(listener);

        // Return unsubscribe function
        return () => {
            this.unregisterPluginChangeListener(listener);
        };
    }

    /**
     * Unregisters a plugin change listener.
     *
     * This method removes the specified listener from the list of registered listeners
     * if it is currently registered.
     *
     * @param listener - The plugin listener to unregister.
     */
    private unregisterPluginChangeListener(listener: PluginListener): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Notifies all registered listeners that a plugin has changed.
     *
     * This method iterates over all listeners and invokes their callback
     * if the listener is interested in the specified plugin.
     *
     * @param plugin - The plugin that has changed.
     */
    private notifyPluginChanged(plugin: string): void {
        this.listeners.forEach((listener) => {
            if (listener.pluginIds.includes(plugin)) {
                listener.callback(plugin);
            }
        });
    }

    getAwaitingPluginsFor(pluginId: string): string[] {
        return this.awaitingDependency[pluginId] || [];
    }
}

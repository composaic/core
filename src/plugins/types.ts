import {
    Optional,
    String,
    Literal,
    Array,
    Record as RuntypeRecord,
    Static,
    Unknown,
    Object,
} from 'runtypes';

export const LogCore = 'core';

/**
 * Describes a single plugin.
 * This will need to be validated by ajv.
 * In the initial implementation, we will use typescript objects, not json.
 */
export interface PluginDescriptor {
    remoteName?: string;
    remoteURL?: string;
    bundleFile?: string;
    remoteModuleName?: string;
    module: string;
    package: string;
    class: string;
    loader?: (
        pluginDescriptor: PluginDescriptor
    ) => Promise<object | undefined>;
    loadedClass?: object;
    loadedModule?: { [exportedModule: string]: object };
    plugin: string;
    load?: 'deferred';
    version: string;
    description: string;
    pluginInstance?: Plugin;
    extensionPoints?: ExtensionPoint[];
    extensions?: Extension[];
    dependencies?: (string | PluginDescriptor)[];
}

export type ExtensionPoint = {
    id: string;
    type: string;
    singleton?: boolean;
    impl?: { plugin: string; extensionImpl?: object; meta?: object }[];
};

export type Extension = {
    plugin: string;
    id: string;
    className: string;
    impl?: object;
    meta?: object;
};

export const PluginManifestExtensionPoints = Object({
    id: String,
    type: String,
    singleton: Optional(Literal(true)),
});
export type PluginManifestExtensionPoints = Static<
    typeof PluginManifestExtensionPoints
>;

export const PluginManifestExtension = Object({
    plugin: String,
    id: String,
    className: String,
    meta: Optional(Array(Unknown)),
});
export type PluginManifestExtension = Static<typeof PluginManifestExtension>;

export const PluginManifestPluginDefinition = Object({
    package: String,
    module: String,
    class: String,
    plugin: String,
    load: Optional(Literal('deferred')),
    version: String,
    description: String,
    extensionPoints: Optional(Array(PluginManifestExtensionPoints)),
    extensions: Optional(Array(PluginManifestExtension)),
});
export type PluginManifestPluginDefinition = Static<
    typeof PluginManifestPluginDefinition
>;

export const RemoteConfig = Object({
    name: String,
    bundleFile: String,
});

export const PluginManifestPlugin = Object({
    remote: RemoteConfig,
    definitions: Array(PluginManifestPluginDefinition),
});
export type PluginManifestPlugin = Static<typeof PluginManifestPlugin>;

export const PluginManifest = Object({
    plugins: Array(PluginManifestPlugin),
});
export type PluginManifest = Static<typeof PluginManifest>;

export abstract class Plugin {
    initialised = false;
    _started = false;
    stopped = false;
    pluginDescriptor: PluginDescriptor = {} as PluginDescriptor;
    extensionsPoints: {
        [extensionPointId: string]: {
            plugin: string;
            extensionImpl?: object;
            meta?: object;
        }[];
    } = {};
    extensions: {
        [id: string]: object;
    } = {};
    get started(): boolean {
        return this._started;
    }
    async start(): Promise<void> {
        this._started = true;
    }
    async stop(): Promise<void> {
        this.stopped = true;
    }
    init(pluginDescriptor: PluginDescriptor): void {
        // if (this.initialised) {
        //     throw new Error('Plugin already initialised');
        // }
        this.pluginDescriptor = pluginDescriptor;
        this.initialised = true;
    }
    getPluginDescriptor(): PluginDescriptor {
        return this.pluginDescriptor;
    }
    connectExtensions(
        extensionPointId: string,
        extensions: {
            plugin: string;
            extensionImpl?: object;
            meta?: object;
        }[]
    ): void {
        // if (this.initialised) {
        //     throw new Error('Plugin already initialised');
        // }
        this.extensionsPoints[extensionPointId] = extensions;
    }
    getConnectedExtensions(
        extensionPointId: string
    ): { plugin: string; extensionImpl?: object; meta?: object }[] {
        return this.extensionsPoints[extensionPointId];
    }
    setExtensionImplementation(
        plugin: string,
        extensionPointId: string,
        extensionImpl: object
    ): void {
        // if (this.initialised) {
        //     throw new Error('Plugin already initialised');
        // }
        this.extensions[plugin + '::' + extensionPointId] = extensionImpl;
    }
    protected getExtensionImpl(plugin: string, extensionId: string): object {
        return this.extensions[plugin + '::' + extensionId];
    }
    getModule(moduleName: string): object {
        return this.pluginDescriptor.loadedModule![moduleName];
    }
}

export type ClassConstructor<T = any> = new (...args: any[]) => T;

const x: PluginDescriptor = {
    module: 'FooPluginModule',
    plugin: '@foo/bar',
    package: 'foo',
    version: '1.0',
    class: 'FooPlugin',
    description: 'bar',
    extensions: [
        {
            plugin: '@foo/baz',
            id: 'qux',
            className: 'path/to/qux',
        },
        {
            plugin: '@foo/baz',
            id: 'qux',
            className: 'path/to/qux',
        },
    ],
    extensionPoints: [
        {
            id: 'baz',
            type: 'qux',
        },
        {
            id: 'baz',
            type: 'qux',
        },
    ],
};

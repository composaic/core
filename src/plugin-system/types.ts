/**
 * Core Plugin System Types
 * 
 * This module defines the core type definitions for the Composaic plugin system.
 * It includes interfaces for plugin metadata, extension points, and manifest structures.
 */

/**
 * Extension point metadata type.
 * Defines a point where other plugins can extend functionality.
 */
export interface ExtensionPointMetadata {
    /** Unique identifier for the extension point */
    id: string;
    /** Type of the extension point */
    type: string;
}

/**
 * Extension metadata with optional UI-specific metadata.
 * Represents a concrete implementation of an extension point by a plugin.
 */
export interface ExtensionMetadata {
    /** ID of the extension point being implemented */
    extensionPoint: ExtensionPointMetadata;
    /** Additional extension-specific metadata */
    [key: string]: any;
}

/**
 * Plugin metadata type.
 * Defines the metadata for a plugin, including its name, version, and dependencies.
 */
export interface PluginMetadataType {
    /** Name of the plugin */
    name: string;
    /** Version of the plugin */
    version: string;
    /** Description of the plugin */
    description?: string;
    /** Author of the plugin */
    author?: string;
    /** Extension points provided by this plugin */
    extensionPoints?: ExtensionPointMetadata[];
    /** Extensions provided by this plugin */
    extensions?: ExtensionMetadata[];
}

/**
 * Plugin manifest type.
 * Represents a single plugin manifest file.
 */
export interface PluginManifest extends PluginMetadataType {
    /** Remote configuration for plugin loading */
    remote?: RemoteConfig;
}

/**
 * Collection manifest type.
 * Represents a collection of plugin manifests.
 */
export interface CollectionManifest {
    /** Name of the collection */
    name: string;
    /** Version of the collection */
    version?: string;
    /** Description of the collection */
    description?: string;
    /** List of plugins in the collection */
    plugins: {
        /** Remote configuration for plugin loading */
        remote?: RemoteConfig;
        /** List of plugin definitions */
        definitions: PluginMetadataType[];
    }[];
}

/**
 * Remote configuration type.
 * Defines how a plugin should be loaded from a remote source.
 */
export interface RemoteConfig {
    /** URL to load the plugin from */
    url?: string;
    /** Bundle file name */
    bundleFile?: string;
}

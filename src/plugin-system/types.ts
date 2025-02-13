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
    /** Plugin providing this extension */
    plugin: string;
    /** ID of the extension point being implemented */
    id: string;
    /** Name of the implementing class */
    className: string;
    /** Additional extension-specific metadata */
    [key: string]: any;
}

/**
 * Plugin metadata type.
 * Defines the metadata for a plugin, including its name, version, and dependencies.
 */
export interface PluginMetadataType {
    /** Plugin identifier */
    plugin: string;
    /** Version of the plugin */
    version: string;
    /** Description of the plugin */
    description?: string;
    /** Module name */
    module: string;
    /** Package name */
    package: string;
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
    /** Main class name */
    class: string;
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

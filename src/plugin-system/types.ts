/**
 * Core Plugin System Types
 * 
 * This module defines the core type definitions for the Composaic plugin system.
 * It includes interfaces for plugin metadata, extension points, and manifest structures.
 */

/**
 * Metadata for a plugin extension point.
 * Extension points define specific areas where plugins can extend or modify the core application.
 */
export interface ExtensionPointMetadata {
    /** Unique identifier for the extension point */
    id: string;
    /** Type of the extension point */
    type: string;
    /** Optional description of what this extension point does */
    description?: string;
}

/**
 * Extension metadata with optional UI-specific metadata.
 * Represents a concrete implementation of an extension point by a plugin.
 */
export interface ExtensionMetadata {
    /** Plugin that owns this extension */
    plugin: string;   
    /** ID of the extension point being implemented */
    id: string;       
    /** Name of the implementing class */
    className: string;  
    /** Additional extension-specific metadata */
    meta?: unknown;   
}

/**
 * Complete metadata for a plugin.
 * Contains all necessary information to load and initialize a plugin.
 */
export interface PluginMetadataType {
    /** Plugin identifier (e.g., "@composaic-tests/navbar") */
    plugin: string;    
    /** Plugin version */
    version: string;
    /** Optional plugin description */
    description?: string;
    /** Loading strategy: 'eager' loads immediately, 'deferred' loads on demand */
    load?: 'eager' | 'deferred';
    /** Package name (e.g., "navbar") */
    package: string;   
    /** Module name (e.g., "NavbarExtension") */
    module: string;    
    /** Class name (e.g., "NavbarExtensionPlugin") */
    class: string;     
    /** List of extensions provided by this plugin */
    extensions?: ExtensionMetadata[];
    /** List of extension points provided by this plugin */
    extensionPoints?: ExtensionPointMetadata[];
}

/**
 * Remote configuration for a plugin.
 * Specifies how to load a plugin from a remote source.
 */
export interface RemoteConfig {
    /** Remote name (e.g., "TestPlugins") */
    name: string;      
    /** Bundle file path (e.g., "TestPlugins.js") */
    bundleFile: string; 
}

/**
 * Collection manifest structure.
 * Represents a collection of plugins that are distributed together.
 */
export interface CollectionManifest {
    /** Collection name (e.g., "@composaic/plugin-test") */
    name: string;      
    /** Array of plugins in this collection */
    plugins: {
        /** Remote configuration for loading the plugin */
        remote: RemoteConfig;
        /** Plugin definitions in this collection */
        definitions: PluginMetadataType[];
    }[];
}

/**
 * Plugin manifest containing metadata about a plugin
 */
export interface PluginManifest {
    plugin: PluginMetadataType;
}

/**
 * Plugin Manifest Configuration Types
 *
 * This module defines the configuration schema for plugin manifest generation.
 * It supports two types of plugins:
 * - Local plugins: Individual manifests colocated with their source
 * - Remote plugins: Collective manifests for federated plugins
 */

/**
 * Remote module configuration
 */
export interface RemoteConfig {
    /** URL to load the plugin from */
    url: string;
    /** Bundle file name */
    bundleFile: string;
}

/**
 * Base configuration for all plugin types
 */
interface BasePluginConfig {
    /** Source directory or file path */
    source: string;
}

/**
 * Local plugin configuration (individual manifest colocated with plugin)
 */
export interface LocalPluginConfig extends BasePluginConfig {
    /** Plugin type identifier */
    type: 'local';
}

/**
 * Application plugin configuration within a collective manifest
 */
export interface AppPluginConfig extends BasePluginConfig {
    /** Remote module configuration */
    remote: RemoteConfig;
}

/**
 * Collective manifest configuration
 */
export interface CollectiveConfig {
    /** Collection name (e.g., "@composaic/app-plugins") */
    name: string;
    /** Output path for the collective manifest file */
    output: string;
    /** List of application plugins */
    plugins: AppPluginConfig[];
}

/**
 * Remote plugin configuration (collective manifest for federated plugins)
 */
export interface RemotePluginConfig {
    /** Plugin type identifier */
    type: 'remote';
    /** Collective manifest configuration */
    collective: CollectiveConfig;
}

/**
 * Build optimization settings
 */
export interface OptimizationConfig {
    /** Directory to store cache files */
    cacheDir?: string;
    /** Watch mode configuration */
    watchMode?: {
        /** Glob patterns to watch */
        patterns: string[];
        /** Debounce time in milliseconds */
        debounceMs?: number;
    };
}

/**
 * Root configuration type
 */
export interface PluginManifestConfig {
    /** List of plugin configurations */
    plugins: (LocalPluginConfig | RemotePluginConfig)[];
    /** Build optimization settings */
    optimization?: OptimizationConfig;
}

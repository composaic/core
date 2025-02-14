/**
 * Plugin Manifest Configuration Types
 *
 * This module defines the configuration schema for plugin manifest generation.
 * It supports both system plugins (individual manifests) and application plugins
 * (collective manifests).
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
 * System plugin configuration (individual manifest)
 */
export interface SystemPluginConfig extends BasePluginConfig {
    /** Plugin type identifier */
    type: 'system';
    /** Output path for the manifest file */
    output: string;
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
 * Application plugins collection configuration
 */
export interface ApplicationPluginConfig {
    /** Plugin type identifier */
    type: 'application';
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
    plugins: (SystemPluginConfig | ApplicationPluginConfig)[];
    /** Build optimization settings */
    optimization?: OptimizationConfig;
}

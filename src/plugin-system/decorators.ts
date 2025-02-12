/**
 * Plugin System Decorators
 * 
 * This module provides TypeScript decorators for the Composaic plugin system.
 * These decorators are used to mark and configure classes as plugins, extension points,
 * and extensions, allowing for runtime discovery and loading of plugin functionality.
 */

import type { ExtensionPointMetadata, PluginMetadataType, ExtensionMetadata } from './types.js';

/** Type definition for a constructor function */
type Constructor = { new (...args: any[]): any };

/**
 * Decorator to mark a class as a plugin.
 * This decorator attaches plugin metadata to the class, making it discoverable
 * by the plugin system at runtime.
 * 
 * @param metadata Plugin metadata excluding extensions
 * @returns Class decorator function
 * 
 * @example
 * ```typescript
 * @PluginMetadata({
 *   plugin: "@composaic/navbar",
 *   version: "1.0.0",
 *   package: "navbar",
 *   module: "NavbarExtension",
 *   class: "NavbarPlugin"
 * })
 * class NavbarPlugin { }
 * ```
 */
export function PluginMetadata(metadata: Omit<PluginMetadataType, 'extensions'>) {
    return function(target: Constructor) {
        Object.defineProperty(target, 'pluginMetadata', {
            value: {
                ...metadata,
                kind: 'plugin'
            },
            writable: false
        });
        return target;
    };
}

/**
 * Decorator for marking a class as an extension point.
 * Extension points define areas where plugins can extend or modify the core application.
 * 
 * @param metadata Array of extension point metadata
 * @returns Class decorator function
 * 
 * @example
 * ```typescript
 * @ExtensionPointMetadata([{
 *   id: "navbar.menu",
 *   type: "MenuExtensionPoint",
 *   description: "Extension point for navbar menu items"
 * }])
 * class NavbarPlugin { }
 * ```
 */
export function ExtensionPointMetadata(metadata: ExtensionPointMetadata[]) {
    return function(target: Constructor) {
        Object.defineProperty(target, 'extensionPointMetadata', {
            value: metadata,
            writable: false
        });
        return target;
    };
}

/**
 * Decorator to mark a class as providing an extension.
 * Extensions are concrete implementations of extension points provided by plugins.
 * 
 * @param metadata Extension metadata
 * @returns Class decorator function
 * 
 * @example
 * ```typescript
 * @ExtensionMetadata({
 *   plugin: "@composaic/navbar",
 *   id: "navbar.menu",
 *   className: "CustomMenuItem"
 * })
 * class CustomMenuItem { }
 * ```
 */
export function ExtensionMetadata(metadata: ExtensionMetadata) {
    return function(target: Constructor) {
        Object.defineProperty(target, 'extensionMetadata', {
            value: metadata,
            writable: false
        });
        return target;
    };
}

/**
 * Helper functions to extract metadata from decorated classes.
 * These utilities are used internally by the plugin system to discover
 * and load plugins, extension points, and extensions at runtime.
 */
export const MetadataHelpers = {
    /**
     * Gets plugin metadata from a decorated class
     * 
     * @param target Class constructor
     * @returns Plugin metadata if present, undefined otherwise
     */
    getPluginMetadata(target: Constructor): PluginMetadataType | undefined {
        return (target as any).pluginMetadata;
    },

    /**
     * Gets extension point metadata from a decorated class
     * 
     * @param target Class constructor
     * @returns Array of extension point metadata
     */
    getExtensionPointMetadata(target: Constructor): ExtensionPointMetadata[] {
        return (target as any).extensionPointMetadata || [];
    },

    /**
     * Gets extension metadata from a decorated class
     * 
     * @param target Class constructor
     * @returns Array of extension metadata
     */
    getExtensionMetadata(target: Constructor): ExtensionMetadata[] {
        return [(target as any).extensionMetadata].filter(Boolean);
    }
};

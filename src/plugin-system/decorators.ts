/**
 * Plugin System Decorators
 * 
 * This module provides TypeScript decorators for the Composaic plugin system.
 * These decorators are used to mark and configure classes as plugins, extension points,
 * and extensions, allowing for runtime discovery and loading of plugin functionality.
 */

import type { PluginMetadataType, ExtensionMetadata } from './types.js';

/** Type definition for a constructor function */
type Constructor = { new (...args: any[]): any };

/**
 * Decorator for marking a class as a plugin.
 * This decorator attaches plugin metadata to the class, making it discoverable
 * by the plugin system at runtime.
 * 
 * @param metadata Plugin metadata
 * @returns Class decorator function
 * 
 * @example
 * ```typescript
 * @PluginMetadata({
 *   name: 'NavbarExtension',
 *   version: '1.0.0',
 *   description: 'A navbar extension plugin'
 * })
 * class NavbarPlugin { }
 * ```
 */
export function PluginMetadata(metadata: PluginMetadataType) {
    return function(target: Constructor) {
        Object.defineProperty(target, 'pluginMetadata', {
            value: metadata,
            writable: false
        });
        return target;
    };
}

/**
 * Decorator for marking a class as an extension.
 * Extensions implement specific extension points defined by plugins.
 * 
 * @param metadata Extension metadata
 * @returns Class decorator function
 * 
 * @example
 * ```typescript
 * @ExtensionMetadata({
 *   extensionPoint: 'navbar.menu',
 *   implementation: 'NavbarItemExtension'
 * })
 * class NavbarItemExtension { }
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

/** Metadata utility functions */
export const Metadata = {
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
     * Gets extension metadata from a decorated class
     * 
     * @param target Class constructor
     * @returns Array of extension metadata
     */
    getExtensionMetadata(target: Constructor): ExtensionMetadata[] {
        return [(target as any).extensionMetadata].filter(Boolean);
    }
};

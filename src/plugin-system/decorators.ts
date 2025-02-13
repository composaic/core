import 'reflect-metadata';

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
 *   plugin: '@composaic/navbar',
 *   version: '0.1.0',
 *   description: 'Navbar Plugin',
 *   module: 'index',
 *   package: 'navbar',
 *   class: 'NavbarPlugin',
 *   extensionPoints: [{
 *     id: 'navbar',
 *     type: 'NavbarExtensionPoint'
 *   }]
 * })
 * class NavbarPlugin { }
 * ```
 */
export function PluginMetadata(metadata: PluginMetadataType) {
    return function(target: Constructor) {
        Reflect.defineMetadata('plugin:metadata', metadata, target);
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
 *   plugin: 'self',
 *   id: 'navbar',
 *   className: 'CustomMenuItem'
 * })
 * class CustomMenuItem { }
 * ```
 */
export function ExtensionMetadata(metadata: ExtensionMetadata) {
    return function(target: Constructor) {
        const existingMetadata = Reflect.getMetadata('extension:metadata', target) || [];
        existingMetadata.push(metadata);
        Reflect.defineMetadata('extension:metadata', existingMetadata, target);
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
        return Reflect.getMetadata('plugin:metadata', target);
    },

    /**
     * Gets extension metadata from a decorated class
     * 
     * @param target Class constructor
     * @returns Array of extension metadata
     */
    getExtensionMetadata(target: Constructor): ExtensionMetadata[] {
        return Reflect.getMetadata('extension:metadata', target) || [];
    }
};

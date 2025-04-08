import { z } from 'zod';
import {
    PluginManifestExtensionPoints,
    PluginManifestExtension,
    PluginManifestPluginDefinition,
    RemoteConfig,
    PluginManifestPlugin,
    PluginManifest,
} from '../plugins/types.js';

export {
    PluginManifestExtensionPoints,
    PluginManifestExtension,
    PluginManifestPluginDefinition,
    RemoteConfig,
    PluginManifestPlugin,
    PluginManifest,
};

export const validateWithZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
    return schema.parse(data);
};

export const pluginManifestSchema = PluginManifest;
export const remoteConfigSchema = RemoteConfig;

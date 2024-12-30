import { convertManifestToPluginDescriptor } from '../dev/plugin-utils.js';
import { PluginManager } from '../plugins/PluginManager.js';
import { PluginDescriptor } from '../plugins/types.js';
import { RemoteDefinition } from './configuration.js';
import { LoggingService } from '../services/LoggingService.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class RemotePluginLoader {
    private static instance: RemotePluginLoader;

    private constructor() {
        // Private constructor to prevent instantiation from outside the class
    }

    public static getInstance(): RemotePluginLoader {
        if (!RemotePluginLoader.instance) {
            RemotePluginLoader.instance = new RemotePluginLoader();
        }
        return RemotePluginLoader.instance;
    }

    /**
     *
     * @param remotes
     */
    async loadManifests(remotes: RemoteDefinition[]): Promise<void> {
        const delay = (ms: number) =>
            new Promise((resolve) => setTimeout(resolve, ms));

        try {
            for (const remote of remotes) {
                LoggingService.getInstance().info({
                    module: 'federation',
                    header: 'loadManifests',
                    message: `Loading manifest from remote: ${remote.host}`,
                });
                const manifestRaw = await fetch(remote.host + '/manifest.json');
                if (!manifestRaw.ok) {
                    throw new Error(
                        `Failed to fetch manifest from ${remote.host}`
                    );
                }
                //await delay(5000);
                const manifest = await manifestRaw.json();
                LoggingService.getInstance().info({
                    module: 'federation',
                    header: 'loadManifests',
                    message: `Loaded manifest from remote: ${remote.host}, manifest: ${JSON.stringify(manifest)}`,
                });
                const pluginDescriptor: PluginDescriptor[] =
                    convertManifestToPluginDescriptor(manifest, remote);
                LoggingService.getInstance().info({
                    module: 'federation',
                    header: 'loadManifests',
                    message: `Converted manifest to plugin descriptor: ${JSON.stringify(pluginDescriptor)}`,
                });
                await PluginManager.getInstance().addPluginDefinitions(
                    pluginDescriptor
                );
                LoggingService.getInstance().info({
                    module: 'federation',
                    header: 'loadManifests',
                    message: `Added plugin definitions from remote: ${remote.host}`,
                });
            }
        } catch (error) {
            LoggingService.getInstance().error({
                module: 'federation',
                header: 'loadManifests',
                message: `error loading manifest: ${JSON.stringify(error)}`,
            });
        } finally {
            LoggingService.getInstance().info({
                module: 'federation',
                header: 'loadManifests',
                message: `done loading manifests from ${remotes.length} remotes.`,
            });
        }
    }
}

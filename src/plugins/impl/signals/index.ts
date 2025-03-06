import { Plugin } from '../../types.js';
import { PluginMetadata } from '../../../plugin-system/decorators.js';

export type SignalDefinition = {
    signal: string;
    handler: string;
    plugin: string;
};

/**
 * Signals extension point.
 */
export interface SignalsExtensionPoint {}

@PluginMetadata({
    plugin: '@composaic/signals',
    version: '0.1.0',
    description: 'Signals Plugin',
    module: 'index',
    package: 'signals',
    extensionPoints: [
        {
            id: 'signals',
            type: 'SignalsExtensionPoint',
        },
    ],
})
export class SignalsPlugin extends Plugin {
    signals: { [key: string]: SignalDefinition } = {};
    async start() {
        super.start();
        const connectedExtensions = this.getConnectedExtensions('signals');
        connectedExtensions &&
            connectedExtensions.forEach((extension) => {
                const signalDefinition = extension.meta! as SignalDefinition[];
                for (const item of signalDefinition) {
                    item.plugin = extension.plugin;
                    this.signals[item.signal] = item;
                }
            });
    }
    async stop() {}
    getSignalDefinition(signalType: string): SignalDefinition | undefined {
        return this.signals[signalType];
    }
}

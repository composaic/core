import { Plugin } from '../../../plugins/types';
import { PluginMetadata, ExtensionMetadata } from '../../decorators';

@PluginMetadata({
    plugin: '@composaic-tests/test-plugin',
    version: '1.0',
    description: 'Test plugin for testing plugin system',
    package: 'test-plugin',
    module: 'TestPlugin',
    extensionPoints: [
        {
            id: 'test.extension',
            type: 'TestExtensionPoint',
        },
    ],
})
@ExtensionMetadata({
    plugin: '@composaic/core',
    id: 'logger',
    className: 'TestLoggerExtension',
})
export class TestPlugin extends Plugin {
    async start() {
        // Plugin initialization
    }
}

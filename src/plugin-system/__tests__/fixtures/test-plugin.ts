import { Plugin } from '../../../plugins/types';
import { PluginMetadata, ExtensionPointMetadata, ExtensionMetadata } from '../../decorators';

@ExtensionPointMetadata({
    id: 'test.extension',
    description: 'Test extension point'
})
export class TestExtensionPoint {
    doSomething(): void {}
}

@PluginMetadata({
    plugin: '@composaic-tests/test-plugin',
    version: '1.0',
    description: 'Test plugin for testing plugin system',
    package: 'test-plugin',
    module: 'TestPlugin',
    class: 'TestPlugin'
})
@ExtensionMetadata({
    plugin: '@composaic/core',
    id: 'logger',
    className: 'TestLoggerExtension'
})
export class TestPlugin extends Plugin {
    async start() {
        // Plugin initialization
    }
}

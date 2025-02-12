import { Plugin } from '../mock-plugin.js';
import { PluginMetadata } from '../../../decorators.js';

@PluginMetadata({
    plugin: '@composaic-tests/plugin1',
    version: '1.0',
    description: 'First test plugin',
    package: 'multiplugins',
    module: 'MultiplePlugins',
    class: 'FirstPlugin'
})
export class FirstPlugin extends Plugin {
    async start() {
        // Plugin initialization
    }
}

@PluginMetadata({
    plugin: '@composaic-tests/plugin2',
    version: '1.0',
    description: 'Second test plugin',
    package: 'multiplugins',
    module: 'MultiplePlugins',
    class: 'SecondPlugin'
})
export class SecondPlugin extends Plugin {
    async start() {
        // Plugin initialization
    }
}

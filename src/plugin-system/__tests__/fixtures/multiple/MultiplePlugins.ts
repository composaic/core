import { PluginMetadata } from '../../../decorators';

@PluginMetadata({
    plugin: '@composaic/plugin1',
    version: '0.1.0',
    description: 'First Plugin',
    module: 'index',
    package: 'plugin1'
})
export class Plugin1 {
    doSomething(): void {
        console.log('Plugin1 doing something');
    }
}

@PluginMetadata({
    plugin: '@composaic/plugin2',
    version: '0.1.0',
    description: 'Second Plugin',
    module: 'index',
    package: 'plugin2'
})
export class Plugin2 {
    doSomething(): void {
        console.log('Plugin2 doing something');
    }
}

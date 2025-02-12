import { PluginMetadata } from '../../../decorators';

@PluginMetadata({
    name: 'Plugin1',
    version: '1.0.0',
    description: 'First plugin'
})
export class Plugin1 {
    doSomething(): void {
        console.log('Plugin1 doing something');
    }
}

@PluginMetadata({
    name: 'Plugin2',
    version: '1.0.0',
    description: 'Second plugin'
})
export class Plugin2 {
    doSomething(): void {
        console.log('Plugin2 doing something');
    }
}

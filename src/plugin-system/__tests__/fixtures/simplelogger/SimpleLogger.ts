import { PluginMetadata, ExtensionMetadata } from '../../../decorators';

@PluginMetadata({
    plugin: '@composaic/logger',
    version: '0.1.0',
    description: 'Logger Plugin',
    module: 'index',
    package: 'logger',
    class: 'LoggerPlugin',
    extensionPoints: [{
        id: 'logger',
        type: 'LoggerExtensionPoint'
    }]
})
export class LoggerPlugin {
    log(message: string): void {
        console.log(`[Logger] ${message}`);
    }
}

@ExtensionMetadata({
    plugin: 'self',
    id: 'logger',
    className: 'SimpleLoggerExtension'
})
export class SimpleLoggerExtension {
    log(message: string): void {
        console.log(`[SimpleLogger] ${message}`);
    }
}

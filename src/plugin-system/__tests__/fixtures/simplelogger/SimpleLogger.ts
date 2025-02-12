import { PluginMetadata } from '../../../decorators';

@PluginMetadata({
    name: 'SimpleLogger',
    version: '1.0.0',
    description: 'A simple logging plugin',
    extensionPoints: [{
        id: 'logger',
        type: 'LoggerExtensionPoint'
    }]
})
export class SimpleLogger {
    log(message: string): void {
        console.log(`[SimpleLogger] ${message}`);
    }
}

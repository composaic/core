import { Plugin } from '../mock-plugin.js';
import { PluginMetadata, ExtensionMetadata, ExtensionPointMetadata } from '../../../decorators.js';

interface LogMessage {
    level: string;
    message: string;
    timestamp: Date;
    subSystemName: string;
}

@PluginMetadata({
    plugin: '@composaic-tests/simple-logger',
    version: '1.0',
    description: 'Simple extension for the Composaic Logger Plugin',
    package: 'simplelogger',
    module: 'SimpleLogger'
})
@ExtensionPointMetadata([{
    id: 'logger',
    type: 'LoggerExtensionPoint'
}])
@ExtensionMetadata({
    plugin: '@composaic/logger',
    id: 'logger',
    className: 'SimpleLoggerExtension'
})
export class SimpleLoggerPlugin extends Plugin {
    extension?: SimpleLoggerExtension;

    async start() {
        // Plugin initialization
    }

    log(message: string) {
        this.extension?.log?.({
            level: 'info',
            message,
            timestamp: new Date(),
            subSystemName: this.extension.getSubSystemName(),
        });
    }
}

export class SimpleLoggerExtension {
    private static idCounter = 0;

    log(message: LogMessage) {
        console.log(`[${message.level.toUpperCase()}] ${message.message}`);
    }

    getSubSystemName(): string {
        return `Logger-${++SimpleLoggerExtension.idCounter}`;
    }
}

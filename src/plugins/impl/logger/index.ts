import { Plugin } from '../../types.js';
import { PluginManager } from '../../PluginManager.js';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type LogMessage = {
    level: LogLevel;
    message: string;
    timestamp: Date;
    subSystemName: string;
    module?: string;
    header?: string;
    args?: unknown[];
};

export const ComposaicSubSystemName = 'composaic';

/**
 * Logger extension point.
 *
 * Extensions for this extension point will need to implement these methods.
 */
export interface LoggerExtensionPoint {
    getSubSystemName(): string;
    setLogCallback(log: (message: LogMessage) => void): void;
}

export class LoggerPlugin extends Plugin {
    async start() {
        super.start();
        this.log({
            level: 'info',
            module: 'plugins',
            header: '@composaic/logger',
            message: 'plugin started',
            timestamp: new Date(),
            subSystemName: ComposaicSubSystemName,
        });
        this.getConnectedExtensions('logger').forEach(async (extension) => {
            // make sure the plugin is loaded (at this point it is probably manifest information loaded only)
            await PluginManager.getInstance().getPlugin(extension.plugin);
            const loggerExtension =
                extension.extensionImpl as LoggerExtensionPoint;
            loggerExtension?.setLogCallback(this.log.bind(this));
        });
    }
    async stop() {}
    log(message: LogMessage) {
        const module = message.module ? `[${message.module}]` : '';
        const header = message.header ? `[${message.header}]` : '';
        console.log(
            `[${message.timestamp.toISOString()}[${message.level.toUpperCase()}][${message.subSystemName}]${module}${header}${': ' + message.message}`
        );
    }
}

export class SimpleLoggerExtension implements LoggerExtensionPoint {
    private log?: (message: LogMessage) => void;
    getSubSystemName(): string {
        return ComposaicSubSystemName;
    }
    setLogCallback(log: (message: LogMessage) => void): void {
        this.log = log;
        this.log({
            level: 'info',
            message: 'Logger initialised',
            timestamp: new Date(),
            subSystemName: this.getSubSystemName(),
        });
    }
}

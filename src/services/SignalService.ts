import { PluginManager } from '../plugins/PluginManager.js';
import { SignalsPlugin } from '../plugins/impl/signals';
import { LoggingService } from '../services/LoggingService.js';

export type Signal = {
    type: string;
    payload: any;
};

export class SignalService {
    private static instance: SignalService;
    private signalsPlugin?: SignalsPlugin; // Assume this is initialized correctly
    private isInitialized: boolean = false;
    private readonly instanceId: number;

    private constructor() {
        // Private constructor to prevent direct construction calls with the `new` operator.
        this.instanceId = Date.now(); // Use the current timestamp as a unique identifier
        LoggingService.getInstance().info({
            module: 'services',
            header: 'SignalService',
            message: `SignalService instance created with ID: ${this.instanceId}`,
        });
    }

    // New method to asynchronously initialize the service
    private async init(): Promise<void> {
        if (!this.isInitialized) {
            LoggingService.getInstance().info({
                module: 'services',
                header: 'SignalService',
                message: `Initializing SignalService with ID: ${this.instanceId}`,
            });
            try {
                const plugin =
                    await PluginManager.getInstance().getPlugin(
                        '@composaic/signals'
                    );
                this.signalsPlugin = plugin as SignalsPlugin;
                this.isInitialized = true;
            } catch (e) {
                LoggingService.getInstance().error({
                    module: 'services',
                    header: 'SignalService',
                    message: `Error loading signals plugin: ${e}`,
                });
                return;
            }
        }
    }

    public static async getInstance(): Promise<SignalService> {
        if (!SignalService.instance) {
            SignalService.instance = new SignalService();
            await SignalService.instance.init(); // Ensure the instance is initialized before returning
        }
        LoggingService.getInstance().info({
            module: 'services',
            header: 'SignalService',
            message: `Using SignalService instance with ID: ${SignalService.instance.instanceId}`,
        });
        return SignalService.instance;
    }

    async send(signal: Signal) {
        if (!this.isInitialized) {
            LoggingService.getInstance().warn({
                module: 'services',
                header: 'SignalService',
                message: `Can't send signal as SignalService instance with ID not initialised: ${SignalService.instance.instanceId}`,
            });
            return;
        }
        // Assuming getPlugin and getModule are async methods available in the system
        const signalDefinition = this.signalsPlugin!.getSignalDefinition(
            signal.type
        );
        if (signalDefinition) {
            const plugin = await PluginManager.getInstance().getPlugin(
                signalDefinition.plugin
            );
            const handlerFn = await plugin?.getModule(signalDefinition.handler);
            if (handlerFn && typeof handlerFn === 'function') {
                handlerFn(signal.payload);
            } else {
                LoggingService.getInstance().warn({
                    module: 'services',
                    header: 'SignalService',
                    message: `Can't send signal as handler for ${signal.type} is not a function.`,
                });
            }
        }
    }
}

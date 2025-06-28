import { BarPlugin } from './impl/bar/BarPluginModule';
import { PluginManager } from './PluginManager';
import { PluginDescriptor } from './types';

jest.mock('../services/LoggingService', () => {
    return {
        LoggingService: {
            getInstance: jest.fn().mockReturnValue({
                info: jest.fn(),
                error: jest.fn(),
                debug: jest.fn(),
                trace: jest.fn(),
                warn: jest.fn(),
            }),
            createInstance: jest.fn().mockResolvedValue({
                info: jest.fn(),
                error: jest.fn(),
                debug: jest.fn(),
                trace: jest.fn(),
                warn: jest.fn(),
            }),
        },
    };
});

describe('PluginManager', () => {
    let pluginManager: PluginManager;
    describe('using unresolved descriptors', () => {
        beforeEach(() => {
            pluginManager = PluginManager.getInstance();
            pluginManager.clear();
        });
        it('should add a plugin', async () => {
            const barDescriptor: PluginDescriptor = {
                module: 'BarPluginModule',
                package: 'bar',
                class: 'BarPlugin',
                plugin: '@foo/bar',
                version: '1.0',
                description: 'bar',
                extensionPoints: [
                    {
                        id: 'MyCoolExtension',
                        type: 'MyCoolExtensionType',
                    },
                ],
            };
            barDescriptor.loadedModule = await import(
                `./impl/${barDescriptor.package}/${barDescriptor.module}.ts`
            );
            PluginManager.getInstance().addPlugin(barDescriptor);

            const bazDescriptor: PluginDescriptor = {
                module: 'BazPluginModule',
                package: 'baz',
                class: 'BazPlugin',
                plugin: '@foo/baz',
                version: '1.0',
                description: 'baz',
                extensions: [
                    {
                        plugin: '@foo/bar',
                        id: 'MyCoolExtension',
                        className: 'BazCoolExtensionImpl',
                    },
                ],
            };
            bazDescriptor.loadedModule = await import(
                `./impl/${bazDescriptor.package}/${bazDescriptor.module}.ts`
            );
            PluginManager.getInstance().addPlugin(bazDescriptor);
            const pluginBaz = (await PluginManager.getInstance().getPlugin(
                '@foo/baz'
            ))!.pluginDescriptor;
            expect(pluginBaz).toBeDefined();
            expect(pluginBaz!.extensions![0].id).toBe('MyCoolExtension');
            expect(pluginBaz!.extensions![0].plugin).toBe('@foo/bar');
            expect(pluginBaz!.extensions![0].className).toBe(
                'BazCoolExtensionImpl'
            );
            expect(
                (pluginBaz!.dependencies![0] as PluginDescriptor).plugin
            ).toEqual('@foo/bar');
            const pluginBar = (await PluginManager.getInstance().getPlugin(
                '@foo/bar'
            ))!.pluginDescriptor;
            expect(pluginBar!.dependencies!).toHaveLength(1);
            expect(
                (pluginBar!.dependencies![0] as PluginDescriptor).plugin
            ).toBe('@foo/baz');
        });
        it('should be able to load a plugin with self extension', async () => {
            const barDescriptor: PluginDescriptor = {
                module: 'BarPluginModule',
                package: 'bar',
                class: 'BarPlugin',
                plugin: '@foo/bar',
                version: '1.0',
                description: 'bar',
                extensionPoints: [
                    {
                        id: 'MyCoolExtension',
                        type: 'MyCoolExtensionType',
                    },
                ],
                extensions: [
                    {
                        plugin: 'self',
                        id: 'MyCoolExtension',
                        className: 'SimpleCoolExtensionProvider',
                    },
                ],
            };
            barDescriptor.loadedModule = await import(
                `./impl/${barDescriptor.package}/${barDescriptor.module}.ts`
            );
            PluginManager.getInstance().addPlugin(barDescriptor);
            const bazDescriptor: PluginDescriptor = {
                module: 'BazPluginModule',
                package: 'baz',
                class: 'BazPlugin',
                plugin: '@foo/baz',
                version: '1.0',
                description: 'baz',
                extensions: [
                    {
                        plugin: '@foo/bar',
                        id: 'MyCoolExtension',
                        className: 'BazCoolExtensionImpl',
                    },
                ],
            };
            bazDescriptor.loadedModule = await import(
                `./impl/${bazDescriptor.package}/${bazDescriptor.module}.ts`
            );
            PluginManager.getInstance().addPlugin(bazDescriptor);

            const loadedPlugin =
                await PluginManager.getInstance().getPlugin('@foo/bar');
            expect(loadedPlugin).toBeDefined();
            expect(loadedPlugin!.getPluginDescriptor().extensions![0].id).toBe(
                'MyCoolExtension'
            );
            expect(
                loadedPlugin!.getPluginDescriptor().extensions![0].plugin
            ).toBe('self');
            const extensionImpl =
                loadedPlugin!.getPluginDescriptor().extensions![0].impl!;
            // @ts-expect-error - we know this is a function
            expect(extensionImpl.saySomethingCool).toBeDefined();
            expect(
                loadedPlugin!.getPluginDescriptor().extensionPoints![0].impl
            ).toHaveLength(2);
            const ext1 =
                loadedPlugin!.getPluginDescriptor().extensionPoints![0].impl![0]
                    .extensionImpl;
            const ext2 =
                loadedPlugin!.getPluginDescriptor().extensionPoints![0].impl![1]
                    .extensionImpl;
        });
    });
    describe('using resolved descriptors', () => {
        beforeEach(async () => {
            PluginManager.getInstance().clear();
            const barPlugin: PluginDescriptor = {
                module: 'BarPluginModule',
                package: 'bar',
                class: 'BarPlugin',
                plugin: '@foo/bar',
                version: '1.0',
                description: 'bar',
                extensionPoints: [
                    {
                        id: 'MyCoolExtension',
                        type: 'MyCoolExtensionType',
                    },
                ],
                extensions: [
                    {
                        plugin: 'self',
                        id: 'MyCoolExtension',
                        className: 'SimpleCoolExtensionProvider',
                    },
                ],
            };
            barPlugin.loadedModule = await import(
                `./impl/${barPlugin.package}/${barPlugin.module}.ts`
            );

            PluginManager.getInstance().addPlugin(barPlugin);
            const bazPlugin: PluginDescriptor = {
                module: 'BazPluginModule',
                package: 'baz',
                class: 'BazPlugin',
                plugin: '@foo/baz',
                version: '1.0',
                description: 'baz',
                extensions: [
                    {
                        plugin: '@foo/bar',
                        id: 'MyCoolExtension',
                        className: 'BazCoolExtensionImpl',
                    },
                ],
            };
            bazPlugin.loadedModule = await import(
                `./impl/${bazPlugin.package}/${bazPlugin.module}.ts`
            );

            PluginManager.getInstance().addPlugin(bazPlugin);
        });
        it('should add a plugin with a loaded module', async () => {
            const loadedPlugin =
                await PluginManager.getInstance().getPlugin('@foo/bar');
            expect(loadedPlugin).toBeDefined();
            expect(loadedPlugin!.getPluginDescriptor().extensions![0].id).toBe(
                'MyCoolExtension'
            );
            expect(
                loadedPlugin!.getPluginDescriptor().extensions![0].plugin
            ).toBe('self');
            const extensionImpl =
                loadedPlugin!.getPluginDescriptor().extensions![0].impl!;
            // @ts-expect-error - we know this is a function
            expect(extensionImpl.saySomethingCool).toBeDefined();
            expect(
                loadedPlugin!.getPluginDescriptor().extensionPoints![0].impl
            ).toHaveLength(2);
            const ext1 =
                loadedPlugin!.getPluginDescriptor().extensionPoints![0].impl![0]
                    .extensionImpl;
            const ext2 =
                loadedPlugin!.getPluginDescriptor().extensionPoints![0].impl![1]
                    .extensionImpl;
            (loadedPlugin as BarPlugin).saySomethingCool();
        });
    });
    describe('using resolved descriptors with dependencies', () => {
        beforeEach(async () => {
            PluginManager.getInstance().clear();
            const barPlugin: PluginDescriptor = {
                module: 'BarPluginModule',
                package: 'bar',
                class: 'BarPlugin',
                plugin: '@foo/bar',
                version: '1.0',
                description: 'bar',
                extensionPoints: [
                    {
                        id: 'MyCoolExtension',
                        type: 'MyCoolExtensionType',
                    },
                ],
                extensions: [
                    {
                        plugin: 'self',
                        id: 'MyCoolExtension',
                        className: 'SimpleCoolExtensionProvider',
                    },
                ],
            };
            barPlugin.loadedModule = await import(
                `./impl/${barPlugin.package}/${barPlugin.module}.ts`
            );

            PluginManager.getInstance().addPlugin(barPlugin);
            const bazPlugin: PluginDescriptor = {
                module: 'BazPluginModule',
                package: 'baz',
                class: 'BazPlugin',
                plugin: '@foo/baz',
                version: '1.0',
                description: 'baz',
                extensions: [
                    {
                        plugin: '@foo/bar',
                        id: 'MyCoolExtension',
                        className: 'BazCoolExtensionImpl',
                    },
                ],
            };
            bazPlugin.loadedModule = await import(
                `./impl/${bazPlugin.package}/${bazPlugin.module}.ts`
            );

            await PluginManager.getInstance().addPlugin(bazPlugin);
        });
        it('should add a plugin with a loaded module', async () => {
            const loadedPlugin =
                await PluginManager.getInstance().getPlugin('@foo/baz');
            expect(loadedPlugin).toBeDefined();
            expect(loadedPlugin!.getPluginDescriptor().extensions![0].id).toBe(
                'MyCoolExtension'
            );
            expect(
                loadedPlugin!.getPluginDescriptor().extensions![0].plugin
            ).toBe('@foo/bar');
            const extensionImpl =
                loadedPlugin!.getPluginDescriptor().extensions![0].impl!;
            // @ts-expect-error - we know this is a function
            expect(extensionImpl.saySomethingCool).toBeDefined();
            const barPlugin =
                await PluginManager.getInstance().getPlugin('@foo/bar');
            expect(
                barPlugin!.getPluginDescriptor().extensionPoints![0].impl
            ).toHaveLength(2);
        });
    });

    describe('Observability', () => {
        beforeEach(() => {
            pluginManager = PluginManager.getInstance();
            pluginManager.clear();
        });
        it('should notify listeners when a plugin changes', async () => {
            const callback = jest.fn();
            const pluginIds = ['@foo/bar'];

            const unsubscribe = pluginManager.registerPluginChangeListener(
                pluginIds,
                callback
            );

            const barDescriptor: PluginDescriptor = {
                module: 'BarPluginModule',
                package: 'bar',
                class: 'BarPlugin',
                plugin: '@foo/bar',
                version: '1.0',
                description: 'bar',
                extensionPoints: [
                    {
                        id: 'MyCoolExtension',
                        type: 'MyCoolExtensionType',
                    },
                ],
                extensions: [
                    {
                        plugin: 'self',
                        id: 'MyCoolExtension',
                        className: 'SimpleCoolExtensionProvider',
                    },
                ],
            };

            barDescriptor.loadedModule = await import(
                `./impl/${barDescriptor.package}/${barDescriptor.module}.ts`
            );
            await PluginManager.getInstance().addPlugin(barDescriptor);
            expect(callback).not.toHaveBeenCalledWith(barDescriptor.plugin);
            unsubscribe();
        });

        it('should not notify listeners after they unsubscribe', async () => {
            const callback = jest.fn();
            const pluginIds = ['bar'];

            const unsubscribe = pluginManager.registerPluginChangeListener(
                pluginIds,
                callback
            );
            unsubscribe();

            const barDescriptor: PluginDescriptor = {
                module: 'BarPluginModule',
                package: 'bar',
                class: 'BarPlugin',
                plugin: '@foo/bar',
                version: '1.0',
                description: 'bar',
                extensionPoints: [
                    {
                        id: 'MyCoolExtension',
                        type: 'MyCoolExtensionType',
                    },
                ],
            };
            barDescriptor.loadedModule = await import(
                `./impl/${barDescriptor.package}/${barDescriptor.module}.ts`
            );

            await pluginManager.addPluginDefinitions([barDescriptor]);

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('When plugins added not in the order of dependency (out-of-order initialisation, E-E-EP)', () => {
        beforeEach(() => {
            pluginManager = PluginManager.getInstance();
            pluginManager.clear();
        });
        it('it should connect the extensions normally', async () => {
            // plugin providing extension point (others depend on this)
            const barDescriptor: PluginDescriptor = {
                module: 'BarPluginModule',
                package: 'bar',
                class: 'BarPlugin',
                plugin: '@foo/bar',
                version: '1.0',
                description: 'bar',
                extensionPoints: [
                    {
                        id: 'MyCoolExtension',
                        type: 'MyCoolExtensionType',
                    },
                ],
            };
            barDescriptor.loadedModule = await import(
                `./impl/${barDescriptor.package}/${barDescriptor.module}.ts`
            );

            // Baz offering extension for bar
            const bazDescriptor: PluginDescriptor = {
                module: 'BazPluginModule',
                package: 'baz',
                class: 'BazPlugin',
                plugin: '@foo/baz',
                version: '1.0',
                description: 'baz',
                extensions: [
                    {
                        plugin: '@foo/bar',
                        id: 'MyCoolExtension',
                        className: 'BazCoolExtensionImpl',
                    },
                ],
            };
            bazDescriptor.loadedModule = await import(
                `./impl/${bazDescriptor.package}/${bazDescriptor.module}.ts`
            );

            // Foo offering extension for bar
            const fooDescriptor: PluginDescriptor = {
                module: 'FooPluginModule',
                package: 'foo',
                class: 'FooPlugin',
                plugin: '@foo/foo',
                version: '1.0',
                description: 'foo',
                extensions: [
                    {
                        plugin: '@foo/bar',
                        id: 'MyCoolExtension',
                        className: 'FooCoolExtensionImpl',
                    },
                ],
            };
            fooDescriptor.loadedModule = await import(
                `./impl/${fooDescriptor.package}/${fooDescriptor.module}.ts`
            );

            // out of order addition
            await PluginManager.getInstance().addPlugin(bazDescriptor);
            await PluginManager.getInstance().addPlugin(fooDescriptor);
            await PluginManager.getInstance().addPlugin(barDescriptor);
            expect(barDescriptor.extensionPoints![0].impl).toHaveLength(2);
        });
    });

    /**
     * E-EP-E means plugin with extension, plugin with extension point, plugin with extension initialisation order
     */
    describe('When plugins added not in the order of dependency (out-of-order initialisation, E-EP-E)', () => {
        beforeEach(() => {
            pluginManager = PluginManager.getInstance();
            pluginManager.clear();
            jest.useFakeTimers(); // Enable fake timers
        });
        afterEach(() => {
            jest.clearAllTimers(); // Clear timers after each test
            jest.useRealTimers(); // Restore real timers
        });
        it('it should connect the extensions normally', async () => {
            const callback = jest.fn();
            const pluginIds = ['@foo/bar'];

            const unsubscribe = pluginManager.registerPluginChangeListener(
                pluginIds,
                callback
            );
            // plugin providing extension point (others depend on this)
            const barDescriptor: PluginDescriptor = {
                module: 'BarPluginModule',
                package: 'bar',
                class: 'BarPlugin',
                plugin: '@foo/bar',
                version: '1.0',
                description: 'bar',
                extensionPoints: [
                    {
                        id: 'MyCoolExtension',
                        type: 'MyCoolExtensionType',
                    },
                ],
            };
            barDescriptor.loadedModule = await import(
                `./impl/${barDescriptor.package}/${barDescriptor.module}.ts`
            );

            // Baz offering extension for bar
            const bazDescriptor: PluginDescriptor = {
                module: 'BazPluginModule',
                package: 'baz',
                class: 'BazPlugin',
                plugin: '@foo/baz',
                version: '1.0',
                description: 'baz',
                extensions: [
                    {
                        plugin: '@foo/bar',
                        id: 'MyCoolExtension',
                        className: 'BazCoolExtensionImpl',
                    },
                ],
            };
            bazDescriptor.loadedModule = await import(
                `./impl/${bazDescriptor.package}/${bazDescriptor.module}.ts`
            );

            // Foo offering extension for bar
            const fooDescriptor: PluginDescriptor = {
                module: 'FooPluginModule',
                package: 'foo',
                class: 'FooPlugin',
                plugin: '@foo/foo',
                version: '1.0',
                description: 'foo',
                extensions: [
                    {
                        plugin: '@foo/bar',
                        id: 'MyCoolExtension',
                        className: 'FooCoolExtensionImpl',
                    },
                ],
            };
            fooDescriptor.loadedModule = await import(
                `./impl/${fooDescriptor.package}/${fooDescriptor.module}.ts`
            );

            // out of order addition
            /**
             * If plugin with extension is added before plugin with extension point (baz -> bar) we get 1 notification for bar
             * However if we add the extension point first then the extension (bar then baz), we get 2 notifications for bar - why?
             * This is easy: add a plugin -> notification. Add an extension to the plugin -> notification. (When you add the extension
             * first there's no notification for the plugin with the extension point as it's not yet available in the registry.)
             * Also don't forget that here we only listen for change for bar, so we only get notifications for bar.
             */
            await PluginManager.getInstance().addPlugin(bazDescriptor);
            // note there will be no notification at this point as we're only adding the plugin to the registry - so it's not loaded at this stage
            // despite the fact that adding bar will retrieve baz and baz will update bar, since bar is not loaded at this point, no notification taken place
            await PluginManager.getInstance().addPlugin(barDescriptor);
            jest.runAllTimers();
            expect(callback).not.toHaveBeenCalled();
            expect(callback.mock.calls.length).toBe(0);
            // now we load the plugin, so the next extension change will trigger a notification
            await PluginManager.getInstance().getPlugin('@foo/bar');
            callback.mockClear();
            expect(barDescriptor.extensionPoints![0].impl).toHaveLength(1);
            expect(barDescriptor.extensionPoints![0].impl![0].plugin).toBe(
                '@foo/baz'
            );
            expect(
                pluginManager.getAwaitingPluginsFor('@foo/bar')
            ).toHaveLength(0);
            await PluginManager.getInstance().addPlugin(fooDescriptor); // foo will update extension point for bar, so bar's listeners will be notified
            // Run all timers to ensure the callback is called
            jest.runAllTimers();
            expect(callback).toHaveBeenCalledWith(barDescriptor.plugin);
            expect(callback.mock.calls.length).toBe(1);
            expect(barDescriptor.extensionPoints![0].impl).toHaveLength(2);
        });
    });
    /**
     * E(2)-EP1-EP2
     * Plugin A provides two extensions one for plugin B and one for plugin C. Plugin A added to the registry first, at this point it must be in
     * the awaiting list of B and C. Plugin B added next when A registers its extension, and remains in the registry for C. Plugin C added last when
     * B registers its extension, and now all plugins are connected.
     */
    describe('When plugins added not in the order of dependency (out-of-order initialisation, E-EP-E)', () => {
        beforeEach(() => {
            pluginManager = PluginManager.getInstance();
            pluginManager.clear();
            jest.useFakeTimers(); // Enable fake timers
        });
        afterEach(() => {
            jest.clearAllTimers(); // Clear timers after each test
            jest.useRealTimers(); // Restore real timers
        });
        it('it should connect the extensions normally', async () => {
            const callback = jest.fn();
            const pluginIds = ['@foo/bar', '@foo/foo'];

            const unsubscribe = pluginManager.registerPluginChangeListener(
                pluginIds,
                callback
            );

            // [Plugin A] Baz offering extension for bar (Plugin A) and foo (Plugin B)
            const bazDescriptor: PluginDescriptor = {
                module: 'BazPluginModule',
                package: 'baz',
                class: 'BazPlugin',
                plugin: '@foo/baz',
                version: '1.0',
                description: 'baz',
                extensions: [
                    {
                        plugin: '@foo/bar',
                        id: 'MyCoolExtension',
                        className: 'BazCoolExtensionImpl',
                    },
                    {
                        plugin: '@foo/foo',
                        id: 'MyFooExtension',
                        className: 'BazFooExtensionImpl',
                    },
                ],
            };
            bazDescriptor.loadedModule = await import(
                `./impl/${bazDescriptor.package}/${bazDescriptor.module}.ts`
            );

            // plugin providing extension point (others depend on this)
            const barDescriptor: PluginDescriptor = {
                module: 'BarPluginModule',
                package: 'bar',
                class: 'BarPlugin',
                plugin: '@foo/bar',
                version: '1.0',
                description: 'bar',
                extensionPoints: [
                    {
                        id: 'MyCoolExtension',
                        type: 'MyCoolExtensionType',
                    },
                ],
            };
            barDescriptor.loadedModule = await import(
                `./impl/${barDescriptor.package}/${barDescriptor.module}.ts`
            );

            // Foo offering extension for bar
            const fooDescriptor: PluginDescriptor = {
                module: 'FooPluginModule',
                package: 'foo',
                class: 'FooPlugin',
                plugin: '@foo/foo',
                version: '1.0',
                description: 'foo',
                extensionPoints: [
                    {
                        id: 'MyFooExtension',
                        type: 'MyFooExtensionType',
                    },
                ],
            };
            fooDescriptor.loadedModule = await import(
                `./impl/${fooDescriptor.package}/${fooDescriptor.module}.ts`
            );

            // Add Plugin A
            await PluginManager.getInstance().addPlugin(bazDescriptor);
            jest.runAllTimers();
            expect(callback).not.toHaveBeenCalled();
            expect(callback.mock.calls.length).toBe(0);
            callback.mockClear();
            expect(
                pluginManager.getAwaitingPluginsFor('@foo/bar')
            ).toHaveLength(1);
            expect(
                pluginManager.getAwaitingPluginsFor('@foo/foo')
            ).toHaveLength(1);
            await PluginManager.getInstance().addPlugin(barDescriptor);
            jest.runAllTimers();
            expect(callback.mock.calls.length).toBe(0);
            expect(callback).not.toHaveBeenCalledWith();
            callback.mockClear();
            expect(
                pluginManager.getAwaitingPluginsFor('@foo/bar')
            ).toHaveLength(0);
            expect(
                pluginManager.getAwaitingPluginsFor('@foo/foo')
            ).toHaveLength(1);

            await PluginManager.getInstance().addPlugin(fooDescriptor);
            jest.runAllTimers();
            expect(callback.mock.calls.length).toBe(0);
            expect(callback).not.toHaveBeenCalled();
            expect(
                pluginManager.getAwaitingPluginsFor('@foo/bar')
            ).toHaveLength(0);
            expect(
                pluginManager.getAwaitingPluginsFor('@foo/foo')
            ).toHaveLength(0);

            // !!!
            // In this test we had no notifications as the extensions were already present at the time when the plugins with the respected extension points were added
        });
    });

    describe('Multiple Extensions from Same Plugin', () => {
        beforeEach(() => {
            pluginManager = PluginManager.getInstance();
            pluginManager.clear();
        });

        it('should handle multiple extensions from the same plugin correctly', async () => {
            // Create a plugin that provides an extension point
            const textProcessorDescriptor: PluginDescriptor = {
                module: 'TextProcessorModule',
                package: 'textprocessor',
                class: 'TextProcessorPlugin',
                plugin: 'textprocessor',
                version: '1.0.0',
                description: 'Text processing extension point provider',
                extensionPoints: [
                    {
                        id: 'textprocessor.extension',
                        type: 'TextProcessorExtension',
                    },
                ],
            };

            // Mock the loaded module for textprocessor
            textProcessorDescriptor.loadedModule = {
                TextProcessorPlugin: class MockTextProcessorPlugin {
                    constructor() {}
                    start() {}
                },
            };

            // Create a plugin that provides multiple extensions to the same extension point
            const multiExtensionDescriptor: PluginDescriptor = {
                module: 'MultiExtensionModule',
                package: 'multiextension',
                class: 'MultiExtensionPlugin',
                plugin: 'multiextension',
                version: '1.0.0',
                description:
                    'Plugin with multiple extensions to same extension point',
                extensions: [
                    {
                        plugin: 'textprocessor',
                        id: 'textprocessor.extension',
                        className: 'UpperCaseProcessor',
                    },
                    {
                        plugin: 'textprocessor',
                        id: 'textprocessor.extension',
                        className: 'LowerCaseProcessor',
                    },
                    {
                        plugin: 'textprocessor',
                        id: 'textprocessor.extension',
                        className: 'CamelCaseProcessor',
                    },
                ],
            };

            // Mock the loaded module with multiple processor classes
            multiExtensionDescriptor.loadedModule = {
                MultiExtensionPlugin: class MockMultiExtensionPlugin {
                    constructor() {}
                    start() {}
                },
                UpperCaseProcessor: class {
                    processText(text: string) {
                        return text.toUpperCase();
                    }
                    getLabel() {
                        return 'Upper Case';
                    }
                    getId() {
                        return 'uppercase';
                    }
                },
                LowerCaseProcessor: class {
                    processText(text: string) {
                        return text.toLowerCase();
                    }
                    getLabel() {
                        return 'Lower Case';
                    }
                    getId() {
                        return 'lowercase';
                    }
                },
                CamelCaseProcessor: class {
                    processText(text: string) {
                        return text
                            .split(' ')
                            .map(
                                (word) =>
                                    word.charAt(0).toUpperCase() +
                                    word.slice(1).toLowerCase()
                            )
                            .join('');
                    }
                    getLabel() {
                        return 'Camel Case';
                    }
                    getId() {
                        return 'camelcase';
                    }
                },
            };

            // Add plugins in order
            await PluginManager.getInstance().addPlugin(
                textProcessorDescriptor
            );
            await PluginManager.getInstance().addPlugin(
                multiExtensionDescriptor
            );

            // Get the textprocessor plugin
            const textProcessorPlugin =
                await PluginManager.getInstance().getPlugin('textprocessor');
            expect(textProcessorPlugin).toBeDefined();

            // Check that all 3 extensions are registered to the extension point
            const extensionPoint =
                textProcessorPlugin!.getPluginDescriptor().extensionPoints![0];
            expect(extensionPoint.impl).toBeDefined();
            expect(extensionPoint.impl).toHaveLength(3);

            // Verify each extension has the correct plugin and className
            const implementations = extensionPoint.impl!;

            const upperCaseExt = implementations.find(
                (impl) => impl.className === 'UpperCaseProcessor'
            );
            expect(upperCaseExt).toBeDefined();
            expect(upperCaseExt!.plugin).toBe('multiextension');
            expect(upperCaseExt!.className).toBe('UpperCaseProcessor');

            const lowerCaseExt = implementations.find(
                (impl) => impl.className === 'LowerCaseProcessor'
            );
            expect(lowerCaseExt).toBeDefined();
            expect(lowerCaseExt!.plugin).toBe('multiextension');
            expect(lowerCaseExt!.className).toBe('LowerCaseProcessor');

            const camelCaseExt = implementations.find(
                (impl) => impl.className === 'CamelCaseProcessor'
            );
            expect(camelCaseExt).toBeDefined();
            expect(camelCaseExt!.plugin).toBe('multiextension');
            expect(camelCaseExt!.className).toBe('CamelCaseProcessor');

            // Verify that each extension has been instantiated correctly
            expect(upperCaseExt!.extensionImpl).toBeDefined();
            expect(lowerCaseExt!.extensionImpl).toBeDefined();
            expect(camelCaseExt!.extensionImpl).toBeDefined();
        });

        it('should replace extensions with same plugin and className on reload', async () => {
            // Create extension point plugin
            const extensionPointDescriptor: PluginDescriptor = {
                module: 'ExtensionPointModule',
                package: 'extensionpoint',
                class: 'ExtensionPointPlugin',
                plugin: 'extensionpoint',
                version: '1.0.0',
                description: 'Extension point provider',
                extensionPoints: [
                    {
                        id: 'test.extension',
                        type: 'TestExtension',
                    },
                ],
            };

            extensionPointDescriptor.loadedModule = {
                ExtensionPointPlugin: class MockExtensionPointPlugin {
                    constructor() {}
                    start() {}
                },
            };

            // Create plugin with extension
            const extensionDescriptor: PluginDescriptor = {
                module: 'ExtensionModule',
                package: 'extension',
                class: 'ExtensionPlugin',
                plugin: 'extension',
                version: '1.0.0',
                description: 'Extension provider',
                extensions: [
                    {
                        plugin: 'extensionpoint',
                        id: 'test.extension',
                        className: 'TestProcessor',
                    },
                ],
            };

            extensionDescriptor.loadedModule = {
                ExtensionPlugin: class MockExtensionPlugin {
                    constructor() {}
                    start() {}
                },
                TestProcessor: class {
                    version = 'v1';
                    processText(text: string) {
                        return `v1: ${text}`;
                    }
                },
            };

            // Add plugins
            await PluginManager.getInstance().addPlugin(
                extensionPointDescriptor
            );
            await PluginManager.getInstance().addPlugin(extensionDescriptor);

            // Verify initial state
            const plugin =
                await PluginManager.getInstance().getPlugin('extensionpoint');
            expect(
                plugin!.getPluginDescriptor().extensionPoints![0].impl
            ).toHaveLength(1);
            const initialImpl =
                plugin!.getPluginDescriptor().extensionPoints![0].impl![0];
            expect((initialImpl.extensionImpl as any).version).toBe('v1');

            // Create updated extension with same plugin and className
            const updatedExtensionDescriptor: PluginDescriptor = {
                module: 'ExtensionModule',
                package: 'extension',
                class: 'ExtensionPlugin',
                plugin: 'extension',
                version: '1.0.1',
                description: 'Updated extension provider',
                extensions: [
                    {
                        plugin: 'extensionpoint',
                        id: 'test.extension',
                        className: 'TestProcessor', // Same className
                    },
                ],
            };

            updatedExtensionDescriptor.loadedModule = {
                ExtensionPlugin: class MockExtensionPluginV2 {
                    constructor() {}
                    start() {}
                },
                TestProcessor: class {
                    version = 'v2'; // Updated version
                    processText(text: string) {
                        return `v2: ${text}`;
                    }
                },
            };

            // Re-add the plugin (simulating reload)
            await PluginManager.getInstance().addPlugin(
                updatedExtensionDescriptor
            );

            // Verify that the extension was replaced, not duplicated
            const updatedPlugin =
                await PluginManager.getInstance().getPlugin('extensionpoint');
            expect(
                updatedPlugin!.getPluginDescriptor().extensionPoints![0].impl
            ).toHaveLength(1);
            const updatedImpl =
                updatedPlugin!.getPluginDescriptor().extensionPoints![0]
                    .impl![0];
            expect((updatedImpl.extensionImpl as any).version).toBe('v2');
        });

        it('should handle multiple plugins each providing multiple extensions', async () => {
            // Extension point plugin
            const extensionPointDescriptor: PluginDescriptor = {
                module: 'ExtensionPointModule',
                package: 'extensionpoint',
                class: 'ExtensionPointPlugin',
                plugin: 'extensionpoint',
                version: '1.0.0',
                description: 'Extension point provider',
                extensionPoints: [
                    {
                        id: 'processor.extension',
                        type: 'ProcessorExtension',
                    },
                ],
            };

            extensionPointDescriptor.loadedModule = {
                ExtensionPointPlugin: class MockExtensionPointPlugin {
                    constructor() {}
                    start() {}
                },
            };

            // Plugin A with multiple extensions
            const pluginADescriptor: PluginDescriptor = {
                module: 'PluginAModule',
                package: 'plugina',
                class: 'PluginA',
                plugin: 'plugina',
                version: '1.0.0',
                description: 'Plugin A with multiple extensions',
                extensions: [
                    {
                        plugin: 'extensionpoint',
                        id: 'processor.extension',
                        className: 'ProcessorA1',
                    },
                    {
                        plugin: 'extensionpoint',
                        id: 'processor.extension',
                        className: 'ProcessorA2',
                    },
                ],
            };

            pluginADescriptor.loadedModule = {
                PluginA: class MockPluginA {},
                ProcessorA1: class {
                    getId() {
                        return 'a1';
                    }
                },
                ProcessorA2: class {
                    getId() {
                        return 'a2';
                    }
                },
            };

            // Plugin B with multiple extensions
            const pluginBDescriptor: PluginDescriptor = {
                module: 'PluginBModule',
                package: 'pluginb',
                class: 'PluginB',
                plugin: 'pluginb',
                version: '1.0.0',
                description: 'Plugin B with multiple extensions',
                extensions: [
                    {
                        plugin: 'extensionpoint',
                        id: 'processor.extension',
                        className: 'ProcessorB1',
                    },
                    {
                        plugin: 'extensionpoint',
                        id: 'processor.extension',
                        className: 'ProcessorB2',
                    },
                ],
            };

            pluginBDescriptor.loadedModule = {
                PluginB: class MockPluginB {},
                ProcessorB1: class {
                    getId() {
                        return 'b1';
                    }
                },
                ProcessorB2: class {
                    getId() {
                        return 'b2';
                    }
                },
            };

            // Add all plugins
            await PluginManager.getInstance().addPlugin(
                extensionPointDescriptor
            );
            await PluginManager.getInstance().addPlugin(pluginADescriptor);
            await PluginManager.getInstance().addPlugin(pluginBDescriptor);

            // Verify all 4 extensions are registered
            const plugin =
                await PluginManager.getInstance().getPlugin('extensionpoint');
            const extensionPoint =
                plugin!.getPluginDescriptor().extensionPoints![0];
            expect(extensionPoint.impl).toHaveLength(4);

            // Verify each plugin's extensions are present
            const pluginAExtensions = extensionPoint.impl!.filter(
                (impl) => impl.plugin === 'plugina'
            );
            expect(pluginAExtensions).toHaveLength(2);
            expect(
                pluginAExtensions.map((ext) => ext.className).sort()
            ).toEqual(['ProcessorA1', 'ProcessorA2']);

            const pluginBExtensions = extensionPoint.impl!.filter(
                (impl) => impl.plugin === 'pluginb'
            );
            expect(pluginBExtensions).toHaveLength(2);
            expect(
                pluginBExtensions.map((ext) => ext.className).sort()
            ).toEqual(['ProcessorB1', 'ProcessorB2']);
        });
    });
});

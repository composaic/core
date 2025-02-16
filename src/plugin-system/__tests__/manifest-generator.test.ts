import * as path from 'path';
import * as fs from 'fs';
import { ManifestGenerator } from '../manifest-generator';

describe('ManifestGenerator', () => {
    const fixturesDir = path.join(__dirname, 'fixtures');
    const navbarPluginPath = path.join(
        fixturesDir,
        'navbar',
        'NavbarExtension.ts'
    );
    const loggerPluginPath = path.join(
        fixturesDir,
        'simplelogger',
        'SimpleLogger.ts'
    );
    const multiplePluginsPath = path.join(
        fixturesDir,
        'multiple',
        'MultiplePlugins.ts'
    );
    const tsConfigPath = path.join(fixturesDir, 'tsconfig.json');

    describe('generateManifest', () => {
        it('should generate manifest for NavbarExtension plugin', async () => {
            const generator = new ManifestGenerator({
                tsConfigPath,
                pluginPath: navbarPluginPath,
            });

            const manifest = await generator.generateManifest();

            // Test field order matches MANIFEST_FIELD_ORDER
            const expectedOrder = [
                'plugin',
                'version',
                'description',
                'module',
                'package',
                'class',
                'extensionPoints',
                'extensions',
            ];

            const manifestFields = Object.keys(manifest);
            expectedOrder.forEach((field, index) => {
                if (field in manifest) {
                    expect(manifestFields.indexOf(field)).toBe(
                        manifestFields.indexOf(expectedOrder[index])
                    );
                }
            });

            expect(manifest).toEqual({
                plugin: '@composaic/navbar',
                version: '0.1.0',
                description: 'Navbar Plugin',
                module: 'index',
                package: 'navbar',
                class: 'NavbarPlugin',
                extensionPoints: [
                    {
                        id: 'navbar',
                        type: 'NavbarExtensionPoint',
                    },
                ],
                extensions: [
                    {
                        plugin: 'self',
                        id: 'navbar',
                        className: 'CustomMenuItem',
                    },
                ],
            });
        });

        it('should preserve field order even with unordered input', async () => {
            // Create a test file with unordered fields
            const unorderedPluginPath = path.join(
                fixturesDir,
                'unordered',
                'UnorderedPlugin.ts'
            );
            await fs.promises.mkdir(path.join(fixturesDir, 'unordered'), {
                recursive: true,
            });
            await fs.promises.writeFile(
                unorderedPluginPath,
                `
                import { PluginMetadata } from '../../../decorators';

                @PluginMetadata({
                    extensionPoints: [{
                        id: 'test',
                        type: 'TestExtensionPoint'
                    }],
                    description: 'Test Plugin',
                    version: '0.1.0',
                    class: 'TestPlugin',
                    plugin: '@composaic/test',
                    package: 'test',
                    module: 'index'
                })
                export class TestPlugin {
                    test(): void {
                        console.log('test');
                    }
                }
            `
            );

            const generator = new ManifestGenerator({
                tsConfigPath,
                pluginPath: unorderedPluginPath,
            });

            const manifest = await generator.generateManifest();

            // Verify field order matches MANIFEST_FIELD_ORDER
            const manifestFields = Object.keys(manifest);
            const MANIFEST_FIELD_ORDER = [
                'plugin',
                'version',
                'description',
                'module',
                'package',
                'class',
                'extensionPoints',
                'extensions',
            ];

            // Only check fields that exist in manifest
            const existingFields = MANIFEST_FIELD_ORDER.filter(
                (field) => field in manifest
            );
            existingFields.forEach((field, index) => {
                expect(manifestFields[index]).toBe(field);
            });

            // Clean up
            await fs.promises.rm(path.join(fixturesDir, 'unordered'), {
                recursive: true,
            });
        });

        it('should collect extension metadata from extension classes not plugin class', async () => {
            const generator = new ManifestGenerator({
                tsConfigPath,
                pluginPath: navbarPluginPath,
            });

            const manifest = await generator.generateManifest();

            // The extension metadata should come from CustomMenuItem class, not NavbarPlugin
            expect(manifest.extensions).toEqual([
                {
                    plugin: 'self',
                    id: 'navbar',
                    className: 'CustomMenuItem',
                },
            ]);

            // Create a new generator for logger plugin
            const loggerGenerator = new ManifestGenerator({
                tsConfigPath,
                pluginPath: loggerPluginPath,
            });

            const loggerManifest = await loggerGenerator.generateManifest();

            // The extension metadata should come from SimpleLoggerExtension class, not LoggerPlugin
            expect(loggerManifest.extensions).toEqual([
                {
                    plugin: 'self',
                    id: 'logger',
                    className: 'SimpleLoggerExtension',
                },
            ]);
        });

        it('should generate manifest for SimpleLogger plugin', async () => {
            const generator = new ManifestGenerator({
                tsConfigPath,
                pluginPath: loggerPluginPath,
            });

            const manifest = await generator.generateManifest();

            expect(manifest).toEqual({
                plugin: '@composaic/logger',
                version: '0.1.0',
                description: 'Logger Plugin',
                module: 'index',
                package: 'logger',
                class: 'LoggerPlugin',
                extensionPoints: [
                    {
                        id: 'logger',
                        type: 'LoggerExtensionPoint',
                    },
                ],
                extensions: [
                    {
                        plugin: 'self',
                        id: 'logger',
                        className: 'SimpleLoggerExtension',
                    },
                ],
            });
        });

        it('should throw error for multiple plugin classes in one file', async () => {
            const generator = new ManifestGenerator({
                tsConfigPath,
                pluginPath: multiplePluginsPath,
            });

            await expect(generator.generateManifest()).rejects.toThrow(
                'Multiple plugin classes found in a single file'
            );
        });

        it('should throw error for plugin class with extension metadata', async () => {
            // Create a test file with both decorators on the same class
            const invalidPluginPath = path.join(
                fixturesDir,
                'invalid',
                'InvalidPlugin.ts'
            );
            await fs.promises.mkdir(path.join(fixturesDir, 'invalid'), {
                recursive: true,
            });
            await fs.promises.writeFile(
                invalidPluginPath,
                `
                import { PluginMetadata, ExtensionMetadata } from '../../../decorators';

                @PluginMetadata({
                    plugin: '@composaic/invalid',
                    version: '0.1.0',
                    description: 'Invalid Plugin',
                    module: 'index',
                    package: 'invalid',
                    extensionPoints: [{
                        id: 'test',
                        type: 'TestExtensionPoint'
                    }]
                })
                @ExtensionMetadata({
                    plugin: 'self',
                    id: 'test',
                    className: 'InvalidPlugin'
                })
                export class InvalidPlugin {
                    test(): void {
                        console.log('test');
                    }
                }
            `
            );

            const generator = new ManifestGenerator({
                tsConfigPath,
                pluginPath: invalidPluginPath,
            });

            await expect(generator.generateManifest()).rejects.toThrow(
                "Plugin class 'InvalidPlugin' cannot have both @PluginMetadata and @ExtensionMetadata decorators"
            );

            // Clean up the test file
            await fs.promises.rm(path.join(fixturesDir, 'invalid'), {
                recursive: true,
            });
        });
    });

    describe('generateCollection', () => {
        it('should generate collection manifest for multiple plugins', async () => {
            const generator = new ManifestGenerator({
                tsConfigPath,
                pluginPath: navbarPluginPath,
            });

            const collection = await generator.generateCollection({
                name: '@composaic/test-plugins',
                pluginSources: [
                    {
                        sourcePath: navbarPluginPath,
                        remote: {
                            url: 'https://plugins.composaic.dev/navbar',
                            bundleFile: 'navbar.js',
                        },
                    },
                    {
                        sourcePath: loggerPluginPath,
                        remote: {
                            url: 'https://plugins.composaic.dev/logger',
                            bundleFile: 'logger.js',
                        },
                    },
                ],
                projectPath: fixturesDir,
            });

            expect(collection).toEqual({
                name: '@composaic/test-plugins',
                plugins: [
                    {
                        remote: {
                            url: 'https://plugins.composaic.dev/navbar',
                            bundleFile: 'navbar.js',
                        },
                        definitions: [
                            {
                                plugin: '@composaic/navbar',
                                version: '0.1.0',
                                description: 'Navbar Plugin',
                                module: 'index',
                                package: 'navbar',
                                class: 'NavbarPlugin',
                                extensions: [
                                    {
                                        plugin: 'self',
                                        id: 'navbar',
                                        className: 'CustomMenuItem',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        remote: {
                            url: 'https://plugins.composaic.dev/logger',
                            bundleFile: 'logger.js',
                        },
                        definitions: [
                            {
                                plugin: '@composaic/logger',
                                version: '0.1.0',
                                description: 'Logger Plugin',
                                module: 'index',
                                package: 'logger',
                                class: 'LoggerPlugin',
                            },
                        ],
                    },
                ],
            });
        });

        it('should preserve field order in collection manifests', async () => {
            const generator = new ManifestGenerator({
                tsConfigPath,
                pluginPath: navbarPluginPath,
            });

            const collection = await generator.generateCollection({
                name: '@composaic/test-plugins',
                pluginSources: [
                    {
                        sourcePath: navbarPluginPath,
                        remote: {
                            url: 'https://plugins.composaic.dev/navbar',
                            bundleFile: 'navbar.js',
                        },
                    },
                ],
                projectPath: fixturesDir,
            });

            // Test that each plugin definition maintains the correct field order
            const pluginDefinition = collection.plugins[0].definitions[0];
            const expectedOrder = [
                'plugin',
                'version',
                'description',
                'module',
                'package',
                'class',
                'extensions',
            ];

            const definitionFields = Object.keys(pluginDefinition);
            expectedOrder.forEach((field, index) => {
                if (field in pluginDefinition) {
                    expect(definitionFields.indexOf(field)).toBe(
                        definitionFields.indexOf(expectedOrder[index])
                    );
                }
            });
        });
    });
});

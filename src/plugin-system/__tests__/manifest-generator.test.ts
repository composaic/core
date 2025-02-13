import * as path from 'path';
import { ManifestGenerator } from '../manifest-generator';

describe('ManifestGenerator', () => {
    const fixturesDir = path.join(__dirname, 'fixtures');
    const navbarPluginPath = path.join(fixturesDir, 'navbar', 'NavbarExtension.ts');
    const loggerPluginPath = path.join(fixturesDir, 'simplelogger', 'SimpleLogger.ts');
    const multiplePluginsPath = path.join(fixturesDir, 'multiple', 'MultiplePlugins.ts');
    const tsConfigPath = path.join(fixturesDir, 'tsconfig.json');

    describe('generateManifest', () => {
        it('should generate manifest for NavbarExtension plugin', async () => {
            const generator = new ManifestGenerator({ 
                tsConfigPath,
                pluginPath: navbarPluginPath 
            });
            
            const manifest = await generator.generateManifest();
            
            expect(manifest).toEqual({
                plugin: '@composaic/navbar',
                version: '0.1.0',
                description: 'Navbar Plugin',
                module: 'index',
                package: 'navbar',
                class: 'NavbarPlugin',
                extensionPoints: [{
                    id: 'navbar',
                    type: 'NavbarExtensionPoint'
                }],
                extensions: [{
                    plugin: 'self',
                    id: 'navbar',
                    className: 'CustomMenuItem'
                }]
            });
        });

        it('should generate manifest for SimpleLogger plugin', async () => {
            const generator = new ManifestGenerator({ 
                tsConfigPath,
                pluginPath: loggerPluginPath 
            });
            
            const manifest = await generator.generateManifest();
            
            expect(manifest).toEqual({
                plugin: '@composaic/logger',
                version: '0.1.0',
                description: 'Logger Plugin',
                module: 'index',
                package: 'logger',
                class: 'LoggerPlugin',
                extensionPoints: [{
                    id: 'logger',
                    type: 'LoggerExtensionPoint'
                }],
                extensions: [{
                    plugin: 'self',
                    id: 'logger',
                    className: 'SimpleLoggerExtension'
                }]
            });
        });

        it('should throw error for multiple plugin classes in one file', async () => {
            const generator = new ManifestGenerator({ 
                tsConfigPath,
                pluginPath: multiplePluginsPath 
            });
            
            await expect(generator.generateManifest()).rejects.toThrow(
                'Multiple plugin classes found in a single file'
            );
        });
    });

    describe('generateCollection', () => {
        it('should generate collection manifest for multiple plugins', async () => {
            const generator = new ManifestGenerator({ 
                tsConfigPath,
                pluginPath: navbarPluginPath 
            });

            const collection = await generator.generateCollection({
                name: '@composaic/test-plugins',
                pluginSources: [
                    {
                        sourcePath: navbarPluginPath,
                        remote: {
                            url: 'https://plugins.composaic.dev/navbar',
                            bundleFile: 'navbar.js'
                        }
                    },
                    {
                        sourcePath: loggerPluginPath,
                        remote: {
                            url: 'https://plugins.composaic.dev/logger',
                            bundleFile: 'logger.js'
                        }
                    }
                ],
                projectPath: fixturesDir
            });

            expect(collection).toEqual({
                name: '@composaic/test-plugins',
                plugins: [
                    {
                        remote: {
                            url: 'https://plugins.composaic.dev/navbar',
                            bundleFile: 'navbar.js'
                        },
                        definitions: [{
                            plugin: '@composaic/navbar',
                            version: '0.1.0',
                            description: 'Navbar Plugin',
                            module: 'index',
                            package: 'navbar',
                            class: 'NavbarPlugin',
                            extensions: [{
                                plugin: 'self',
                                id: 'navbar',
                                className: 'CustomMenuItem'
                            }]
                        }]
                    },
                    {
                        remote: {
                            url: 'https://plugins.composaic.dev/logger',
                            bundleFile: 'logger.js'
                        },
                        definitions: [{
                            plugin: '@composaic/logger',
                            version: '0.1.0',
                            description: 'Logger Plugin',
                            module: 'index',
                            package: 'logger',
                            class: 'LoggerPlugin'
                        }]
                    }
                ]
            });
        });
    });
});

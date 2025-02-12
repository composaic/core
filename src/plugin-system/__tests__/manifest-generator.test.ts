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
                name: 'NavbarExtension',
                version: '1.0.0',
                description: 'A navbar extension plugin',
                extensionPoints: [{
                    id: 'navbar',
                    type: 'NavbarExtensionPoint'
                }],
                extensions: [{
                    extensionPoint: {
                        id: 'navbar',
                        type: 'NavbarExtensionPoint'
                    },
                    implementation: 'CustomMenuItem'
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
                name: 'SimpleLogger',
                version: '1.0.0',
                description: 'A simple logging plugin',
                extensionPoints: [{
                    id: 'logger',
                    type: 'LoggerExtensionPoint'
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
                            name: 'NavbarExtension',
                            version: '1.0.0',
                            description: 'A navbar extension plugin',
                            extensions: [{
                                extensionPoint: {
                                    id: 'navbar',
                                    type: 'NavbarExtensionPoint'
                                },
                                implementation: 'CustomMenuItem'
                            }]
                        }]
                    },
                    {
                        remote: {
                            url: 'https://plugins.composaic.dev/logger',
                            bundleFile: 'logger.js'
                        },
                        definitions: [{
                            name: 'SimpleLogger',
                            version: '1.0.0',
                            description: 'A simple logging plugin'
                        }]
                    }
                ]
            });
        });
    });
});

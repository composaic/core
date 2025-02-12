import * as path from 'path';
import { ManifestGenerator } from '../manifest-generator';

describe('ManifestGenerator', () => {
    const fixturesDir = path.join(__dirname, 'fixtures');
    const navbarPluginPath = path.join(fixturesDir, 'navbar/NavbarExtension.ts');
    const loggerPluginPath = path.join(fixturesDir, 'simplelogger/SimpleLogger.ts');
    const pluginPaths = [
        navbarPluginPath,
        loggerPluginPath
    ];

    describe('Single Plugin Manifest', () => {
        it('should generate manifest for navbar plugin', async () => {
            const generator = new ManifestGenerator([navbarPluginPath]);
            const manifest = generator.generate({ sourcePath: navbarPluginPath });
            expect(manifest).toMatchObject({
                plugin: '@composaic-tests/navbar',
                version: '1.0'
            });
        });

        it('should generate manifest for logger plugin', async () => {
            const generator = new ManifestGenerator([loggerPluginPath]);
            const manifest = generator.generate({ sourcePath: loggerPluginPath });
            expect(manifest).toMatchObject({
                plugin: '@composaic-tests/simple-logger',
                version: '1.0'
            });
        });

        it('should throw error when multiple plugins are in one file', async () => {
            const multiplePluginsPath = path.join(__dirname, 'fixtures/multiplugins/MultiplePlugins.ts');
            const generator = new ManifestGenerator([multiplePluginsPath]);
            
            expect(() => {
                generator.generate({ sourcePath: multiplePluginsPath });
            }).toThrow(/Multiple plugin classes found.*FirstPlugin.*SecondPlugin/);
        });
    });

    describe('Collection Manifest', () => {
        it('should generate collection manifest for multiple plugins', () => {
            const generator = new ManifestGenerator(pluginPaths, fixturesDir);
            const collection = generator.generateCollection({
                name: '@composaic/plugin-test',
                pluginSources: [{
                    sourcePath: pluginPaths[0],
                    remote: {
                        name: 'TestPlugins',
                        bundleFile: 'TestPlugins.js'
                    }
                }, {
                    sourcePath: pluginPaths[1],
                    remote: {
                        name: 'TestPlugins',
                        bundleFile: 'TestPlugins.js'
                    }
                }],
                projectPath: fixturesDir
            });

            expect(collection).toEqual({
                name: '@composaic/plugin-test',
                plugins: [{
                    remote: {
                        name: 'TestPlugins',
                        bundleFile: 'TestPlugins.js'
                    },
                    definitions: [{
                        plugin: '@composaic-tests/navbar',
                        version: '1.0',
                        description: 'Extension for the @composaic/navbar plugin',
                        load: 'deferred',
                        package: 'navbar',
                        module: 'NavbarExtension',
                        extensions: [{
                            plugin: '@composaic/navbar',
                            id: 'navbarItem',
                            className: 'NavbarItemExtension',
                            meta: [{
                                id: 'test.RemoteExamples',
                                label: 'Remote Examples',
                                mountAt: 'root.Profile',
                                children: [{
                                    label: 'Remote Example',
                                    path: '/remoteexample',
                                    component: 'RemoteExamplePage'
                                }]
                            }]
                        }]
                    }]
                }, {
                    remote: {
                        name: 'TestPlugins',
                        bundleFile: 'TestPlugins.js'
                    },
                    definitions: [{
                        plugin: '@composaic-tests/simple-logger',
                        version: '1.0',
                        description: 'Simple extension for the Composaic Logger Plugin',
                        package: 'simplelogger',
                        module: 'SimpleLogger',
                        extensions: [{
                            plugin: '@composaic/logger',
                            id: 'logger',
                            className: 'SimpleLoggerExtension'
                        }]
                    }]
                }]
            });
        });
    });
});

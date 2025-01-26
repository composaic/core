import {
    convertManifestToPluginDescriptor,
    loadRemotePlugin,
} from './plugin-utils';

describe('local-plugin-utils', () => {
    it('should convert remote manifest to plugin descriptor', () => {
        // Arrange
        const manifest = {
            plugins: [
                {
                    remote: {
                        name: 'test',
                        bundleFile: 'TestBundle.js',
                        moduleName: './TestModule',
                    },
                    definitions: [
                        {
                            package: 'test-package',
                            module: 'TestModule',
                            class: 'test-class',
                            plugin: 'test-plugin',
                            version: '1.0.0',
                            description: 'test-description',
                            extensionPoints: [
                                {
                                    id: 'test-id',
                                    type: 'test-type',
                                },
                            ],
                            extensions: [
                                {
                                    plugin: 'test-plugin',
                                    id: 'test-id',
                                    className: 'test-class',
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        // Act
        const result = convertManifestToPluginDescriptor(manifest, {
            name: 'Remote1',
            host: 'http://localhost:9000',
            file: 'remoteEntry.js',
        });
        expect(result).toEqual([
            {
                remoteName: 'Remote1',
                remoteURL: 'http://localhost:9000',
                bundleFile: 'remoteEntry.js',
                remoteModuleName: 'TestModule',
                module: 'TestModule',
                package: 'test-package',
                class: 'test-class',
                load: undefined,
                loader: loadRemotePlugin,
                plugin: 'test-plugin',
                version: '1.0.0',
                description: 'test-description',
                extensionPoints: [
                    {
                        id: 'test-id',
                        type: 'test-type',
                    },
                ],
                extensions: [
                    {
                        plugin: 'test-plugin',
                        id: 'test-id',
                        className: 'test-class',
                        meta: undefined,
                    },
                ],
            },
        ]);
    });

    it('should handle undefined extensions gracefully', () => {
        // Arrange
        const manifestWithoutExtensions = {
            plugins: [
                {
                    remote: {
                        name: 'test-no-extensions',
                        bundleFile: 'TestBundle.js',
                        moduleName: './TestModule',
                    },
                    definitions: [
                        {
                            package: 'test-package-no-extensions',
                            module: 'test-module',
                            class: 'test-class',
                            plugin: 'test-plugin',
                            version: '1.0.0',
                            description: 'test-description without extensions',
                            // extensions is intentionally left undefined
                            extensionPoints: [
                                {
                                    id: 'test-id-no-extensions',
                                    type: 'test-type',
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        // Act
        const result = convertManifestToPluginDescriptor(
            manifestWithoutExtensions
        );

        // Assert
        expect(result).toBeDefined();
        expect(result[0].extensions).toBeUndefined();
        expect(result[0].extensionPoints).toBeDefined();
    });

    it('should handle undefined extensionPoints gracefully', () => {
        // Arrange
        const manifestWithoutExtensionPoints = {
            plugins: [
                {
                    remote: {
                        name: 'test-no-extensionPoints',
                        bundleFile: 'TestBundle.js',
                        moduleName: './TestModule',
                    },
                    definitions: [
                        {
                            package: 'test-package-no-extensionPoints',
                            module: 'test-module',
                            class: 'test-class',
                            plugin: 'test-plugin',
                            version: '1.0.0',
                            description:
                                'test-description without extensionPoints',
                            extensions: [
                                {
                                    plugin: 'test-plugin',
                                    id: 'test-id',
                                    className: 'test-class',
                                },
                            ],
                            // extensionPoints is intentionally left undefined
                        },
                    ],
                },
            ],
        };

        // Act
        const result = convertManifestToPluginDescriptor(
            manifestWithoutExtensionPoints
        );

        // Assert
        expect(result).toBeDefined();
        expect(result[0].extensionPoints).toBeUndefined();
        expect(result[0].extensions).toBeDefined();
    });
});

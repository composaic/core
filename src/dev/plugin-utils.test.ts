import { convertManifestToPluginDescriptor } from './plugin-utils';

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
        const result = convertManifestToPluginDescriptor(
            manifest,
            'http://localhost:9000'
        );
        expect(result).toEqual([
            {
                remoteName: 'test',
                remoteURL: 'http://localhost:9000',
                bundleFile: 'TestBundle.js',
                remoteModuleName: './TestModule',
                module: 'TestModule',
                package: 'test-package',
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

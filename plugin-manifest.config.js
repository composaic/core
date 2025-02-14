/** @type {import('./src/plugin-system/config-types').PluginManifestConfig} */
module.exports = {
    plugins: [
        {
            // System plugin example (logger)
            type: 'system',
            source: 'src/plugins/impl/logger/index.ts',
            output: 'src/plugins/impl/logger/logger-plugin.json',
        },
        {
            // Application plugins collection example
            type: 'application',
            collective: {
                name: '@composaic/test-plugins',
                output: 'dist/test-plugins-manifest.json',
                plugins: [
                    {
                        source: 'src/plugin-system/__tests__/fixtures/navbar/NavbarExtension.ts',
                        remote: {
                            url: 'https://plugins.composaic.dev/navbar',
                            bundleFile: 'navbar.js',
                        },
                    },
                ],
            },
        },
    ],
    optimization: {
        cacheDir: '.manifest-cache',
        watchMode: {
            patterns: ['src/**/*.ts'],
            debounceMs: 100,
        },
    },
};

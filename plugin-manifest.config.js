/** @type {import('./src/plugin-system/config-types').PluginManifestConfig} */
module.exports = {
    plugins: [
        {
            type: 'system',
            source: 'src/plugins/impl/logger/index.ts',
            output: 'src/plugins/impl/logger/logger-plugin.json',
        },
        {
            type: 'system',
            source: 'src/plugins/impl/signals/index.ts',
            output: 'src/plugins/impl/signals/signals-plugin.json',
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

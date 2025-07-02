/** @type {import('./src/plugin-system/config-types').PluginManifestConfig} */
module.exports = {
    plugins: [
        {
            type: 'local',
            source: 'src/plugins/impl/logger/index.ts',
        },
        {
            type: 'local',
            source: 'src/plugins/impl/signals/index.ts',
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

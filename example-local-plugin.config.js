/** @type {import('./src/plugin-system/config-types').PluginManifestConfig} */
module.exports = {
    plugins: [
        // NEW: Local plugins - scan directory for plugins with decorators
        // This generates individual [plugin-id].manifest.json files next to each plugin
        {
            type: 'local',
            source: '../examples/textprocessor/src/plugins',
            tsconfig: '../examples/textprocessor/tsconfig.json',
        },

        // You can also specify individual local plugin files
        {
            type: 'local',
            source: '../examples/textprocessor/src/plugins/casetransform/CaseTransformPlugin.ts',
            tsconfig: '../examples/textprocessor/tsconfig.json',
        },
    ],
    optimization: {
        cacheDir: '.manifest-cache',
        watchMode: {
            patterns: ['../examples/**/*.ts'],
            debounceMs: 100,
        },
    },
};

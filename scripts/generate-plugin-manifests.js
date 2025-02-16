#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Constants
const PLUGINS_DIR = path.join(process.cwd(), 'src', 'plugins', 'impl');
const CLI_PATH = './dist/cjs/plugin-system/cli.js';

// Fixed manifest field order
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

/**
 * Find all plugin folders that contain an index.ts and a manifest json
 */
function findPluginFolders() {
    const pluginFolders = fs.readdirSync(PLUGINS_DIR);
    return pluginFolders
        .map((folder) => {
            const folderPath = path.join(PLUGINS_DIR, folder);
            const stats = fs.statSync(folderPath);

            if (!stats.isDirectory()) return null;

            const indexPath = path.join(folderPath, 'index.ts');
            const pluginFile = `${folder}-plugin.json`;
            const manifestPath = path.join(folderPath, pluginFile);

            // Verify required files exist
            if (!fs.existsSync(indexPath) || !fs.existsSync(manifestPath))
                return null;

            return {
                folder,
                indexPath,
                manifestPath,
            };
        })
        .filter(Boolean);
}

/**
 * Check if manifest needs regeneration
 */
function needsRegeneration(sourcePath, manifestPath) {
    if (!fs.existsSync(manifestPath)) return true;

    const sourceStats = fs.statSync(sourcePath);
    const manifestStats = fs.statSync(manifestPath);

    return sourceStats.mtimeMs > manifestStats.mtimeMs;
}

/**
 * Apply fixed field ordering to manifest
 */
function reorderManifest(newManifest) {
    const orderedManifest = {};
    // Apply fixed field order
    MANIFEST_FIELD_ORDER.forEach((key) => {
        if (key in newManifest) {
            orderedManifest[key] = newManifest[key];
        }
    });
    return orderedManifest;
}

/**
 * Generate manifest for a plugin using the CLI
 */
function generateManifest(plugin) {
    console.log(`Processing plugin: ${plugin.folder}`);

    // Only generate if source is newer than manifest
    if (needsRegeneration(plugin.indexPath, plugin.manifestPath)) {
        console.log(`Generating manifest for: ${plugin.folder}`);
        try {
            // Create a temporary file for the new manifest
            const tempManifestPath = `${plugin.manifestPath}.temp`;

            execSync(
                `node ${CLI_PATH} generate -p ${plugin.indexPath} -o ${tempManifestPath}`,
                {
                    stdio: 'inherit',
                }
            );

            // Read the generated manifest
            const newManifest = JSON.parse(
                fs.readFileSync(tempManifestPath, 'utf8')
            );

            // Apply fixed field ordering
            const orderedManifest = reorderManifest(newManifest);

            // Write the ordered manifest directly to the plugin manifest file
            fs.writeFileSync(
                plugin.manifestPath,
                JSON.stringify(orderedManifest, null, 4)
            );
            fs.unlinkSync(tempManifestPath);

            console.log(`Updated plugin manifest: ${plugin.manifestPath}`);
        } catch (error) {
            console.error(
                `Error generating manifest for ${plugin.folder}:`,
                error
            );
            process.exit(1);
        }
    } else {
        console.log(`Skipping ${plugin.folder} - manifest is up to date`);
    }
}

// Main execution
try {
    const plugins = findPluginFolders();

    if (plugins.length === 0) {
        console.log('No plugins found in src/plugins/impl');
        process.exit(0);
    }

    console.log(`Found ${plugins.length} plugins`);
    plugins.forEach(generateManifest);
} catch (error) {
    console.error('Error:', error);
    process.exit(1);
}

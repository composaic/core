#!/usr/bin/env node

/**
 * Local Plugin Manifest Generator
 *
 * This script scans directories for local plugins (TypeScript files with @PluginMetadata decorators)
 * and generates individual manifest files next to each plugin file.
 * The generated manifests can be used to create plugin modules for local consumption.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Constants
const CLI_PATH = './dist/cjs/plugin-system/cli.js';

/**
 * Configuration for local plugin scanning
 */
const DEFAULT_CONFIG = {
    // Directories to scan for local plugins
    scanDirectories: [
        // Add scan directories here, e.g.:
        // '../examples/textprocessor/src/plugins',
    ],
    // Output directory for manifests (optional - defaults to next to plugin files)
    outputDir: undefined,
    // TypeScript config file path
    tsconfig: 'tsconfig.json',
    // File patterns to include
    includePatterns: ['**/*.ts', '**/*.tsx'],
    // File patterns to exclude
    excludePatterns: [
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/node_modules/**',
    ],
};

/**
 * Get configuration from command line arguments or config file
 */
function getConfig() {
    const args = process.argv.slice(2);
    let config = { ...DEFAULT_CONFIG };

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--dir':
            case '-d':
                if (args[i + 1]) {
                    config.scanDirectories = [args[i + 1]];
                    i++;
                }
                break;
            case '--output':
            case '-o':
                if (args[i + 1]) {
                    config.outputDir = args[i + 1];
                    i++;
                }
                break;
            case '--tsconfig':
                if (args[i + 1]) {
                    config.tsconfig = args[i + 1];
                    i++;
                }
                break;
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
                break;
        }
    }

    // If no scan directories specified, show help
    if (config.scanDirectories.length === 0) {
        console.error('Error: No scan directories specified.');
        printHelp();
        process.exit(1);
    }

    return config;
}

/**
 * Print help information
 */
function printHelp() {
    console.log(`
Local Plugin Manifest Generator

Usage: node generate-local-plugin-manifests.js [options]

Options:
  -d, --dir <path>        Directory to scan for local plugins (required)
  -o, --output <path>     Output directory for manifests (optional)
  --tsconfig <path>       Path to tsconfig.json (default: tsconfig.json)
  -h, --help              Show this help message

Examples:
  # Scan a directory for plugins and generate manifests next to each plugin
  node generate-local-plugin-manifests.js --dir ../examples/textprocessor/src/plugins

  # Scan with custom output directory
  node generate-local-plugin-manifests.js --dir ../examples/textprocessor/src/plugins --output ./manifests

  # Scan with custom tsconfig
  node generate-local-plugin-manifests.js --dir ../examples/textprocessor/src/plugins --tsconfig ../examples/textprocessor/tsconfig.json
`);
}

/**
 * Create a temporary config file for the CLI
 */
function createTempConfig(scanDirectories, outputDir, tsconfig) {
    const tempConfig = {
        plugins: scanDirectories.map((dir) => ({
            type: 'local',
            source: dir,
            outputDir: outputDir,
            tsconfig: tsconfig,
        })),
        optimization: {
            cacheDir: '.manifest-cache',
        },
    };

    const tempConfigPath = path.join(process.cwd(), 'temp-local-config.json');
    fs.writeFileSync(tempConfigPath, JSON.stringify(tempConfig, null, 2));
    return tempConfigPath;
}

/**
 * Main execution
 */
async function main() {
    try {
        const config = getConfig();

        console.log('Local Plugin Manifest Generator');
        console.log('==============================');
        console.log(
            `Scanning directories: ${config.scanDirectories.join(', ')}`
        );
        if (config.outputDir) {
            console.log(`Output directory: ${config.outputDir}`);
        }
        console.log(`TypeScript config: ${config.tsconfig}`);
        console.log('');

        // Create temporary config file
        const tempConfigPath = createTempConfig(
            config.scanDirectories,
            config.outputDir,
            config.tsconfig
        );

        try {
            // Execute the CLI with the temporary config
            execSync(`node ${CLI_PATH} generate --config ${tempConfigPath}`, {
                stdio: 'inherit',
            });
        } finally {
            // Clean up temporary config file
            if (fs.existsSync(tempConfigPath)) {
                fs.unlinkSync(tempConfigPath);
            }
        }

        console.log('');
        console.log('Local plugin manifest generation completed!');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Only run when executed directly
if (require.main === module) {
    main();
}

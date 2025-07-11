#!/usr/bin/env node

/**
 * Plugin Manifest Generator CLI
 *
 * Command-line interface for generating plugin manifests from TypeScript decorators.
 * Supports local plugins (individual manifests) and remote plugins (collective manifests).
 */

import { Command } from 'commander';
import path from 'path';
import * as fs from 'fs';
import {
    PluginManifestConfig,
    LocalPluginConfig,
    RemotePluginConfig,
} from './config-types';
import { ManifestGenerator } from './manifest-generator';

const program = new Command();

interface GenerateOptions {
    config?: string;
    plugin?: string;
    type?: 'local' | 'remote';
    output?: string;
    collection?: string;
    name?: string;
    tsconfig?: string;
    force?: boolean;
    verboseComposaic?: boolean;
}

/**
 * Load and validate configuration file
 */
export function loadConfig(configPath: string): PluginManifestConfig {
    const resolvedPath = path.resolve(process.cwd(), configPath);

    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Configuration file not found: ${resolvedPath}`);
    }

    let config;
    try {
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
        try {
            config = JSON.parse(fileContent);
        } catch {
            // If JSON parse fails, try requiring (for JS/TS files)
            config = require(resolvedPath);
            // If the config is a module with a default export, use that
            if (config && config.__esModule && config.default) {
                config = config.default;
            }
        }
    } catch (error) {
        throw new Error(
            `Failed to load configuration file: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    // Basic validation
    if (!config || typeof config !== 'object') {
        throw new Error('Configuration must be an object');
    }
    if (!Array.isArray(config.plugins)) {
        throw new Error('Configuration must have a plugins array');
    }

    return config;
}

/**
 * Check if manifest generation is needed based on timestamps
 */
export function needsRegeneration(
    sourcePath: string,
    outputPath: string,
    force = false
): boolean {
    // Always regenerate if force is true
    if (force) {
        return true;
    }

    // Always regenerate if output doesn't exist
    if (!fs.existsSync(outputPath)) {
        return true;
    }

    try {
        const manifestStat = fs.statSync(outputPath);
        const sourceStat = fs.statSync(sourcePath);

        return sourceStat.mtimeMs > manifestStat.mtimeMs;
    } catch (error) {
        // If there's any error reading the files, regenerate to be safe
        return true;
    }
}

/**
 * Generate manifest for a single plugin
 */
export async function generateSingleManifest(
    sourcePath: string,
    outputPath: string,
    force = false,
    verboseComposaic = false
): Promise<void> {
    if (!needsRegeneration(sourcePath, outputPath, force)) {
        console.log(`Skipping ${sourcePath} - manifest is up to date`);
        return;
    }

    const projectRoot = process.cwd();
    const generator = new ManifestGenerator({
        tsConfigPath: path.resolve(projectRoot, 'tsconfig.json'),
        pluginPath: sourcePath,
        force: force,
        verboseComposaic: verboseComposaic,
    });

    const manifest = await generator.generateManifest();

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 4));
    console.log(`Generated manifest to ${outputPath}`);
}

/**
 * Generate manifests for local plugins by scanning a directory
 */
export async function generateLocalPluginManifests(
    config: LocalPluginConfig,
    configDir: string,
    force = false,
    verboseComposaic = false
): Promise<void> {
    const sourcePath = path.isAbsolute(config.source)
        ? config.source
        : path.resolve(configDir, config.source);

    const tsconfigPath = path.resolve(configDir, 'tsconfig.json');

    // Check if source is a directory or file
    const sourceStat = fs.statSync(sourcePath);

    if (sourceStat.isDirectory()) {
        // Scan directory for plugin files
        await scanDirectoryForPlugins(
            sourcePath,
            undefined,
            tsconfigPath,
            force,
            verboseComposaic
        );
    } else if (sourceStat.isFile()) {
        // Process single plugin file
        await generateLocalPluginManifest(
            sourcePath,
            undefined,
            tsconfigPath,
            force,
            verboseComposaic
        );
    } else {
        throw new Error(
            `Source path is neither a file nor directory: ${sourcePath}`
        );
    }
}

/**
 * Scan a directory recursively for plugin files and generate manifests
 */
async function scanDirectoryForPlugins(
    dirPath: string,
    _outputDir: string | undefined, // Keep parameter for now but ignore it
    tsconfigPath: string,
    force: boolean,
    verboseComposaic = false
): Promise<void> {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            // Recursively scan subdirectories
            await scanDirectoryForPlugins(
                fullPath,
                _outputDir,
                tsconfigPath,
                force,
                verboseComposaic
            );
        } else if (
            entry.isFile() &&
            (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))
        ) {
            // Check if this TypeScript file contains a plugin
            if (await containsPluginMetadata(fullPath, tsconfigPath)) {
                await generateLocalPluginManifest(
                    fullPath,
                    undefined, // Always generate next to source
                    tsconfigPath,
                    force,
                    verboseComposaic
                );
            }
        }
    }
}

/**
 * Check if a TypeScript file contains plugin metadata
 */
async function containsPluginMetadata(
    filePath: string,
    tsconfigPath: string
): Promise<boolean> {
    try {
        const generator = new ManifestGenerator({
            tsConfigPath: tsconfigPath,
            pluginPath: filePath,
        });

        // Try to generate manifest - if it succeeds, the file contains plugin metadata
        await generator.generateManifest();
        return true;
    } catch (error) {
        // If manifest generation fails, this file doesn't contain valid plugin metadata
        return false;
    }
}

/**
 * Generate manifest for a single local plugin file
 */
async function generateLocalPluginManifest(
    sourcePath: string,
    _outputDir: string | undefined, // Keep parameter for now but ignore it
    tsconfigPath: string,
    force: boolean,
    verboseComposaic = false
): Promise<void> {
    const generator = new ManifestGenerator({
        tsConfigPath: tsconfigPath,
        pluginPath: sourcePath,
        force: force,
        verboseComposaic: verboseComposaic,
    });

    try {
        const manifest = await generator.generateManifest();

        // Always generate manifest next to source file
        const sourceDir = path.dirname(sourcePath);
        // Replace '/' with ':' in plugin ID for the filename and remove nested directory
        const pluginId = manifest.plugin.replace(
            /(@[^\/]+)\/([^\/]+)/,
            '$1:$2'
        );
        const outputPath = path.resolve(sourceDir, `${pluginId}.manifest.json`);

        // Check if regeneration is needed
        if (!needsRegeneration(sourcePath, outputPath, force)) {
            console.log(`Skipping ${sourcePath} - manifest is up to date`);
            return;
        }

        // Ensure output directory exists
        const outputDirPath = path.dirname(outputPath);
        if (!fs.existsSync(outputDirPath)) {
            fs.mkdirSync(outputDirPath, { recursive: true });
        }

        fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 4));
        console.log(`Generated local plugin manifest: ${outputPath}`);
    } catch (error) {
        console.log(`Skipping ${sourcePath} - no valid plugin metadata found`);
    }
}

/**
 * Generate manifests based on configuration
 */
export async function generateFromConfig(
    config: PluginManifestConfig,
    configPath: string,
    force = false,
    verboseComposaic = false
): Promise<void> {
    if (verboseComposaic) {
        console.log(
            `Processing config with ${config.plugins.length} plugin(s)`
        );
        console.log('Config:', JSON.stringify(config, null, 2));
    }
    const configDir = path.dirname(path.resolve(process.cwd(), configPath));
    for (const plugin of config.plugins) {
        if (plugin.type === 'local') {
            await generateLocalPluginManifests(
                plugin as LocalPluginConfig,
                configDir,
                force,
                verboseComposaic
            );
        } else {
            const remotePlugin = plugin as RemotePluginConfig;
            const manifestPath = path.isAbsolute(remotePlugin.collective.output)
                ? remotePlugin.collective.output
                : path.resolve(configDir, remotePlugin.collective.output);

            // When force is true, skip timestamp checks entirely
            if (!force) {
                // Only check timestamps if we're not forcing regeneration
                if (fs.existsSync(manifestPath)) {
                    const manifestTime = fs.statSync(manifestPath).mtimeMs;
                    let needsUpdate = false;

                    for (const plugin of remotePlugin.collective.plugins) {
                        try {
                            const sourcePath = path.isAbsolute(plugin.source)
                                ? plugin.source
                                : path.resolve(configDir, plugin.source);
                            if (
                                fs.statSync(sourcePath).mtimeMs > manifestTime
                            ) {
                                needsUpdate = true;
                                break;
                            }
                        } catch {
                            // Skip missing files
                            continue;
                        }
                    }

                    if (!needsUpdate) {
                        console.log(
                            `Skipping ${manifestPath} - no plugin files modified (use --force to override)`
                        );
                        continue;
                    }
                }
            }

            const projectRoot = process.cwd();
            const generator = new ManifestGenerator({
                tsConfigPath: path.resolve(projectRoot, 'tsconfig.json'),
                pluginPath: path.isAbsolute(
                    remotePlugin.collective.plugins[0].source
                )
                    ? remotePlugin.collective.plugins[0].source
                    : path.resolve(
                          configDir,
                          remotePlugin.collective.plugins[0].source
                      ),
                force: force,
                verboseComposaic: verboseComposaic,
            });

            const manifest = await generator.generateCollection({
                name: remotePlugin.collective.name,
                pluginSources: remotePlugin.collective.plugins.map((p) => ({
                    sourcePath: path.isAbsolute(p.source)
                        ? p.source
                        : path.resolve(configDir, p.source),
                    remote: p.remote,
                })),
            });

            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
            console.log(`Generated collective manifest: ${manifestPath}`);
        }
    }
}

program
    .name('manifest-gen')
    .description('Generate plugin manifests from TypeScript decorators')
    .version('0.1.0');

const generateCommand = new Command('generate')
    .description('Generate plugin manifests')
    .option('-c, --config <path>', 'path to configuration file')
    .option('-p, --plugin <path>', 'plugin source path (single plugin mode)')
    .option('-t, --type <type>', 'plugin type (local or remote)')
    .option('-o, --output <path>', 'output path for manifest')
    .option('--collection <glob>', 'glob pattern for collection plugins')
    .option('--collection-name <name>', 'collection name')
    .option('-f, --force', 'force regeneration even if up to date')
    .option(
        '--verbose, --verbose-composaic',
        'enable verbose output for Composaic operations'
    )
    .action(async (options: GenerateOptions) => {
        console.log(
            'CLI Action called with options:',
            JSON.stringify(options, null, 2)
        );
        try {
            if (options.config) {
                console.log('Loading config from:', options.config);
                const config = loadConfig(options.config);
                await generateFromConfig(
                    config,
                    options.config,
                    options.force,
                    options.verboseComposaic
                );
            } else if (options.plugin) {
                if (!options.output) {
                    throw new Error(
                        'Output path is required in single plugin mode'
                    );
                }
                await generateSingleManifest(
                    options.plugin,
                    options.output,
                    options.force,
                    options.verboseComposaic
                );
            } else {
                throw new Error(
                    'Either --config or --plugin must be specified'
                );
            }
        } catch (error: unknown) {
            console.error(
                'Error:',
                error instanceof Error ? error.message : String(error)
            );
            process.exit(1);
        }
    });

const watchCommand = new Command('watch')
    .description('Watch for changes and regenerate manifests')
    .option('-c, --config <path>', 'path to configuration file')
    .action(async (options) => {
        if (!options.config) {
            console.error('Config file is required for watch mode');
            process.exit(1);
        }

        const config = loadConfig(options.config);
        const configDir = path.dirname(
            path.resolve(process.cwd(), options.config)
        );
        // Get watch directory and patterns from config
        const watchMode = config.optimization?.watchMode as any;
        const watchDir = watchMode?.directory || 'dist/';
        const watchPath = path.join(configDir, watchDir);
        const patterns = watchMode?.patterns || ['src_plugins_*.js'];

        // Pattern matching function
        const minimatch = require('minimatch');
        const matchesAnyPattern = (filePath: string): boolean => {
            const fileName = path.basename(filePath);
            return patterns.some((pattern: string) =>
                minimatch(fileName, pattern)
            );
        };

        const debounceMs = config.optimization?.watchMode?.debounceMs || 100;

        console.log(`Watching directory: ${watchPath}`);
        console.log(`File patterns: ${patterns.join(', ')}`);

        // Debug: Check if watch directory exists and show current matching files
        const fs = require('fs');
        if (fs.existsSync(watchPath)) {
            const files = fs.readdirSync(watchPath);
            const matchingFiles = files.filter((file: string) =>
                matchesAnyPattern(path.join(watchPath, file))
            );
            console.log(
                `Found ${matchingFiles.length} matching files: ${matchingFiles.join(', ')}`
            );
        } else {
            console.log(`Watch directory does not exist: ${watchPath}`);
        }

        const chokidar = require('chokidar');
        const watcher = chokidar.watch(watchPath, {
            persistent: true,
            ignoreInitial: true,
            usePolling: false, // Use native file system events
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 50,
            },
            atomic: true, // Handle atomic writes (like webpack does)
        });

        let timeoutId: NodeJS.Timeout | null = null;
        const debouncedGenerate = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(async () => {
                try {
                    await generateFromConfig(config, options.config, false);
                    console.log('Manifests updated successfully');
                } catch (error) {
                    console.error(
                        'Error updating manifests:',
                        error instanceof Error ? error.message : String(error)
                    );
                }
                timeoutId = null;
            }, debounceMs);
        };

        // Add debugging and error handling
        watcher.on('ready', () => {
            console.log('Watcher is ready and watching for changes...');
        });

        watcher.on('error', (error: Error) => {
            console.error('Watcher error:', error);
        });

        watcher.on('change', (filePath: string) => {
            if (matchesAnyPattern(filePath)) {
                console.log(`File ${filePath} has been changed`);
                debouncedGenerate();
            }
        });

        watcher.on('add', (filePath: string) => {
            if (matchesAnyPattern(filePath)) {
                console.log(`File ${filePath} has been added`);
                debouncedGenerate();
            }
        });

        watcher.on('unlink', (filePath: string) => {
            if (matchesAnyPattern(filePath)) {
                console.log(`File ${filePath} has been removed`);
                debouncedGenerate();
            }
        });

        process.on('SIGINT', () => {
            watcher.close();
            process.exit(0);
        });
    });

export function setupCli() {
    return program.addCommand(generateCommand).addCommand(watchCommand);
}

// Only run when executed directly, not when imported for tests
if (require.main === module) {
    setupCli().parse();
}

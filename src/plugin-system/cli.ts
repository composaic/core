#!/usr/bin/env node

/**
 * Plugin Manifest Generator CLI
 *
 * Command-line interface for generating plugin manifests from TypeScript decorators.
 * Supports both system plugins (individual manifests) and application plugins
 * (collective manifests).
 */

import { Command } from 'commander';
import path from 'path';
import * as fs from 'fs';
import {
    PluginManifestConfig,
    SystemPluginConfig,
    ApplicationPluginConfig,
} from './config-types';
import { ManifestGenerator } from './manifest-generator';

const program = new Command();

interface GenerateOptions {
    config?: string;
    plugin?: string;
    type?: 'system' | 'application';
    output?: string;
    collection?: string;
    name?: string;
    tsconfig?: string;
    force?: boolean;
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
    if (force) return true;

    if (!fs.existsSync(outputPath)) return true;

    const manifestStat = fs.statSync(outputPath);
    const sourceStat = fs.statSync(sourcePath);

    return sourceStat.mtimeMs > manifestStat.mtimeMs;
}

/**
 * Generate manifest for a single plugin
 */
export async function generateSingleManifest(
    sourcePath: string,
    outputPath: string,
    tsConfigPath: string,
    force = false
): Promise<void> {
    if (!needsRegeneration(sourcePath, outputPath, force)) {
        console.log(`Skipping ${sourcePath} - manifest is up to date`);
        return;
    }

    const generator = new ManifestGenerator({
        tsConfigPath,
        pluginPath: sourcePath,
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
 * Generate manifests based on configuration
 */
export async function generateFromConfig(
    config: PluginManifestConfig,
    configPath: string,
    force = false
): Promise<void> {
    const configDir = path.dirname(path.resolve(process.cwd(), configPath));
    for (const plugin of config.plugins) {
        if (plugin.type === 'system') {
            const systemPlugin = plugin as SystemPluginConfig;
            const sourcePath = path.isAbsolute(systemPlugin.source)
                ? systemPlugin.source
                : path.resolve(configDir, systemPlugin.source);
            const outputPath = path.isAbsolute(systemPlugin.output)
                ? systemPlugin.output
                : path.resolve(configDir, systemPlugin.output);
            const tsconfigPath = path.isAbsolute(
                systemPlugin.tsconfig || 'tsconfig.json'
            )
                ? systemPlugin.tsconfig || 'tsconfig.json'
                : path.resolve(
                      configDir,
                      systemPlugin.tsconfig || 'tsconfig.json'
                  );

            await generateSingleManifest(
                sourcePath,
                outputPath,
                tsconfigPath,
                force
            );
        } else {
            const appPlugin = plugin as ApplicationPluginConfig;
            const manifestPath = path.isAbsolute(appPlugin.collective.output)
                ? appPlugin.collective.output
                : path.resolve(configDir, appPlugin.collective.output);

            // Check timestamps before any processing
            if (!force && fs.existsSync(manifestPath)) {
                const manifestTime = fs.statSync(manifestPath).mtimeMs;
                let needsUpdate = false;

                for (const plugin of appPlugin.collective.plugins) {
                    try {
                        const sourcePath = path.isAbsolute(plugin.source)
                            ? plugin.source
                            : path.resolve(configDir, plugin.source);
                        if (fs.statSync(sourcePath).mtimeMs > manifestTime) {
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
                        `Skipping ${manifestPath} - no plugin files modified`
                    );
                    continue;
                }
            }

            const generator = new ManifestGenerator({
                tsConfigPath: path.resolve(configDir, 'tsconfig.json'),
                pluginPath: path.isAbsolute(
                    appPlugin.collective.plugins[0].source
                )
                    ? appPlugin.collective.plugins[0].source
                    : path.resolve(
                          configDir,
                          appPlugin.collective.plugins[0].source
                      ),
            });

            const manifest = await generator.generateCollection({
                name: appPlugin.collective.name,
                pluginSources: appPlugin.collective.plugins.map((p) => ({
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
    .option('-t, --type <type>', 'plugin type (system or application)')
    .option('-o, --output <path>', 'output path for manifest')
    .option('--collection <glob>', 'glob pattern for collection plugins')
    .option('--collection-name <name>', 'collection name')
    .option('--tsconfig <path>', 'path to tsconfig.json', 'tsconfig.json')
    .option('-f, --force', 'force regeneration even if up to date')
    .action(async (options: GenerateOptions) => {
        try {
            if (options.config) {
                const config = loadConfig(options.config);
                await generateFromConfig(config, options.config, options.force);
            } else if (options.plugin) {
                if (!options.output) {
                    throw new Error(
                        'Output path is required in single plugin mode'
                    );
                }
                await generateSingleManifest(
                    options.plugin,
                    options.output,
                    options.tsconfig || 'tsconfig.json',
                    options.force
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
    .option('--tsconfig <path>', 'path to tsconfig.json', 'tsconfig.json')
    .action(async (options) => {
        if (!options.config) {
            console.error('Config file is required for watch mode');
            process.exit(1);
        }

        const config = loadConfig(options.config);
        const configDir = path.dirname(
            path.resolve(process.cwd(), options.config)
        );
        const patterns = (config.optimization?.watchMode?.patterns || []).map(
            (pattern) => path.join(configDir, pattern)
        );
        const debounceMs = config.optimization?.watchMode?.debounceMs || 100;

        console.log(`Watching for changes in ${configDir}...`);
        console.log(`Patterns: ${patterns.join(', ')}`);

        const chokidar = require('chokidar');
        const watcher = chokidar.watch(patterns, {
            persistent: true,
            ignoreInitial: true,
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

        watcher.on('change', (path: string) => {
            console.log(`File ${path} has been changed`);
            debouncedGenerate();
        });

        watcher.on('add', (path: string) => {
            console.log(`File ${path} has been added`);
            debouncedGenerate();
        });

        watcher.on('unlink', (path: string) => {
            console.log(`File ${path} has been removed`);
            debouncedGenerate();
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

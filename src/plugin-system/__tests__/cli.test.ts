import * as path from 'path';
import * as fs from 'fs';
import { Command } from 'commander';
import {
    loadConfig,
    needsRegeneration,
    generateSingleManifest,
    generateFromConfig,
} from '../cli';
import { SystemPluginConfig } from '../config-types';

describe('CLI', () => {
    const fixturesDir = path.join(__dirname, 'fixtures');
    const configFile = path.join(fixturesDir, 'test-config.json');
    const tsConfigPath = path.join(fixturesDir, 'tsconfig.json');

    beforeEach(async () => {
        // Create test configuration file
        await fs.promises.writeFile(
            configFile,
            JSON.stringify(
                {
                    plugins: [
                        {
                            type: 'system',
                            source: path.join(
                                fixturesDir,
                                'simplelogger',
                                'SimpleLogger.ts'
                            ),
                            output: path.join(
                                fixturesDir,
                                'simplelogger',
                                'logger-plugin-ai.json'
                            ),
                        },
                    ],
                },
                null,
                2
            )
        );
    });

    afterEach(async () => {
        // Cleanup test files
        try {
            await fs.promises.unlink(configFile);
            const aiManifestPath = path.join(
                fixturesDir,
                'simplelogger',
                'logger-plugin-ai.json'
            );
            if (fs.existsSync(aiManifestPath)) {
                await fs.promises.unlink(aiManifestPath);
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('loadConfig', () => {
        it('should load and validate configuration file', () => {
            const config = loadConfig(configFile);
            expect(config).toBeDefined();
            expect(Array.isArray(config.plugins)).toBe(true);
        });

        it('should throw error for non-existent config file', () => {
            expect(() => loadConfig('nonexistent.json')).toThrow(
                'Configuration file not found'
            );
        });

        it('should throw error for invalid config format', async () => {
            // Create invalid config with plugins not being an array
            await fs.promises.writeFile(
                configFile,
                '{"plugins": "not-an-array"}'
            );

            expect(() => loadConfig(configFile)).toThrow(
                'Configuration must have a plugins array'
            );
        });
    });

    describe('needsRegeneration', () => {
        const sourcePath = path.join(fixturesDir, 'test-source.ts');
        const outputPath = path.join(fixturesDir, 'test-output.json');

        beforeEach(async () => {
            // Create test files
            await fs.promises.writeFile(
                sourcePath,
                'export class TestPlugin {}'
            );
            await fs.promises.writeFile(outputPath, '{}');
        });

        afterEach(async () => {
            // Cleanup test files
            try {
                await fs.promises.unlink(sourcePath);
                await fs.promises.unlink(outputPath);
            } catch (error) {
                // Ignore cleanup errors
            }
        });

        it('should return true if output does not exist', () => {
            expect(needsRegeneration(sourcePath, 'nonexistent.json')).toBe(
                true
            );
        });

        it('should return true if source is newer than output', async () => {
            // Update source file timestamp to be newer
            const stats = fs.statSync(outputPath);
            await fs.promises.utimes(
                sourcePath,
                stats.atime,
                new Date(stats.mtimeMs + 1000)
            );

            expect(needsRegeneration(sourcePath, outputPath)).toBe(true);
        });

        it('should return false if output is newer than source', async () => {
            // Update output file timestamp to be newer
            const stats = fs.statSync(sourcePath);
            await fs.promises.utimes(
                outputPath,
                stats.atime,
                new Date(stats.mtimeMs + 1000)
            );

            expect(needsRegeneration(sourcePath, outputPath)).toBe(false);
        });

        it('should return true if force flag is set', () => {
            expect(needsRegeneration(sourcePath, outputPath, true)).toBe(true);
        });
    });

    describe('generateSingleManifest', () => {
        const sourcePath = path.join(
            fixturesDir,
            'simplelogger',
            'SimpleLogger.ts'
        );
        const outputPath = path.join(
            fixturesDir,
            'simplelogger',
            'logger-plugin-ai.json'
        );

        afterEach(async () => {
            // Cleanup generated manifest
            try {
                if (fs.existsSync(outputPath)) {
                    await fs.promises.unlink(outputPath);
                }
            } catch (error) {
                // Ignore cleanup errors
            }
        });

        it('should generate manifest for a single plugin', async () => {
            await generateSingleManifest(
                sourcePath,
                outputPath,
                tsConfigPath,
                true
            );
            expect(fs.existsSync(outputPath)).toBe(true);

            const manifest = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
            expect(manifest).toMatchObject({
                plugin: '@composaic/logger',
                version: '0.1.0',
                description: 'Logger Plugin',
            });
        });

        it('should skip generation if manifest is up to date', async () => {
            // First generate the manifest
            await generateSingleManifest(
                sourcePath,
                outputPath,
                tsConfigPath,
                true
            );
            const originalStat = fs.statSync(outputPath);

            // Try to generate again without force
            await generateSingleManifest(
                sourcePath,
                outputPath,
                tsConfigPath,
                false
            );
            const newStat = fs.statSync(outputPath);

            expect(newStat.mtimeMs).toBe(originalStat.mtimeMs);
        });
    });

    describe('generateFromConfig', () => {
        it('should generate manifests based on configuration', async () => {
            const config = loadConfig(configFile);
            await generateFromConfig(config, true);

            // Verify manifest was generated
            const plugin = config.plugins[0] as SystemPluginConfig;
            const manifestPath = plugin.output;
            expect(fs.existsSync(manifestPath)).toBe(true);

            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            expect(manifest).toMatchObject({
                plugin: '@composaic/logger',
                version: '0.1.0',
                description: 'Logger Plugin',
            });
        });

        it('should respect force flag when generating from config', async () => {
            const config = loadConfig(configFile);

            // Generate first time
            await generateFromConfig(config, true);
            const plugin = config.plugins[0] as SystemPluginConfig;
            const firstStat = fs.statSync(plugin.output);

            // Try to generate again without force
            await generateFromConfig(config, false);
            const secondStat = fs.statSync(plugin.output);

            expect(secondStat.mtimeMs).toBe(firstStat.mtimeMs);
        });
    });
});

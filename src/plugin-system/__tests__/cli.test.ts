import * as path from 'path';
import * as fs from 'fs';
import { Command } from 'commander';
import {
    loadConfig,
    needsRegeneration,
    generateSingleManifest,
    generateFromConfig,
} from '../cli';
import { LocalPluginConfig } from '../config-types';

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
                            type: 'local',
                            source: path.join(
                                fixturesDir,
                                'simplelogger',
                                'SimpleLogger.ts'
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
            const manifestPath = path.join(
                fixturesDir,
                'simplelogger',
                '@composaic:logger.manifest.json'
            );
            if (fs.existsSync(manifestPath)) {
                await fs.promises.unlink(manifestPath);
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
            '@composaic:logger.manifest.json'
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
            await generateSingleManifest(sourcePath, outputPath, true);
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
            await generateSingleManifest(sourcePath, outputPath, true);
            const originalStat = fs.statSync(outputPath);

            // Try to generate again without force
            await generateSingleManifest(sourcePath, outputPath, false);
            const newStat = fs.statSync(outputPath);

            expect(newStat.mtimeMs).toBe(originalStat.mtimeMs);
        });
    });

    describe('generateFromConfig', () => {
        it('should generate manifests based on configuration', async () => {
            const config = loadConfig(configFile);
            await generateFromConfig(config, configFile, true);

            // Verify manifest was generated
            const plugin = config.plugins[0] as LocalPluginConfig;
            const manifestPath = path.join(
                path.dirname(plugin.source),
                '@composaic:logger.manifest.json'
            );
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
            await generateFromConfig(config, configFile, true);

            const plugin = config.plugins[0] as LocalPluginConfig;
            const manifestPath = path.join(
                path.dirname(plugin.source),
                '@composaic:logger.manifest.json'
            );
            const firstStat = fs.statSync(manifestPath);

            // Try to generate again without force
            await generateFromConfig(config, configFile, false);
            const secondStat = fs.statSync(manifestPath);

            expect(secondStat.mtimeMs).toBe(firstStat.mtimeMs);
        });
    });
});

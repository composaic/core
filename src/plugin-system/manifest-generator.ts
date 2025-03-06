/**
 * Plugin Manifest Generator
 *
 * This module provides functionality to generate plugin manifests by analyzing TypeScript source files.
 * It uses the TypeScript Compiler API to extract metadata from plugin classes decorated with @PluginMetadata.
 */

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import {
    PluginManifest,
    PluginMetadataType,
    CollectionManifest,
    RemoteConfig,
    ExtensionMetadata,
} from './types';
import { Metadata } from './decorators';

// Define the standard order for manifest fields
const MANIFEST_FIELD_ORDER = [
    'package',
    'module',
    'class',
    'plugin',
    'load',
    'version',
    'description',
    'extensionPoints',
    'extensions',
] as const;

/**
 * Orders an object's fields according to the standard manifest field order
 */
function orderManifestFields<T extends object>(manifest: T): T {
    const orderedManifest: any = {};

    // First add fields in our standard order
    MANIFEST_FIELD_ORDER.forEach((field) => {
        if (field in manifest) {
            orderedManifest[field] = manifest[field as keyof T];
        }
    });

    // Then add any remaining fields that weren't in our standard order
    Object.keys(manifest).forEach((key) => {
        if (!(key in orderedManifest)) {
            orderedManifest[key] = manifest[key as keyof T];
        }
    });

    return orderedManifest as T;
}

/**
 * Options for generating a single plugin manifest
 */
export interface GenerateOptions {
    /**
     * Path to the plugin source file
     */
    sourcePath: string;
    /**
     * Where to write the manifest (defaults to next to source)
     */
    outputPath?: string;
    /**
     * Root of the project (for relative paths)
     */
    projectPath?: string;
}

/**
 * Options for generating a collection manifest containing multiple plugins
 */
export interface GenerateCollectionOptions {
    /**
     * Collection name (e.g., "@composaic/plugin-test")
     */
    name: string;
    /**
     * Array of plugin source files or directories
     */
    pluginSources: {
        /**
         * Path to the plugin source file
         */
        sourcePath: string;
        /**
         * Remote configuration for the plugin
         */
        remote: RemoteConfig;
    }[];
    /**
     * Root project path for relative paths
     */
    projectPath?: string;
}

/**
 * ManifestGenerator is responsible for generating plugin manifests by analyzing TypeScript source files
 * and extracting metadata from plugin classes.
 */
export class ManifestGenerator {
    private program: ts.Program;
    private typeChecker: ts.TypeChecker;
    private options: { tsConfigPath: string; pluginPath: string };

    constructor(options: { tsConfigPath: string; pluginPath: string }) {
        this.options = options;
        const { tsConfigPath } = options;

        // Load and parse tsconfig.json
        const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
        const parsedConfig = ts.parseJsonConfigFileContent(
            configFile.config,
            ts.sys,
            path.dirname(tsConfigPath)
        );

        // Create program instance
        this.program = ts.createProgram({
            rootNames: [options.pluginPath],
            options: parsedConfig.options,
        });
        this.typeChecker = this.program.getTypeChecker();
    }

    /**
     * Generate a manifest for a single plugin
     */
    async generateManifest(): Promise<PluginManifest> {
        const sourceFile = this.program.getSourceFile(this.options.pluginPath);
        if (!sourceFile) {
            throw new Error(
                `Could not load source file: ${this.options.pluginPath}`
            );
        }

        console.log('Analyzing source file:', this.options.pluginPath);
        const result = this.findPluginClass(sourceFile);
        console.log('Found plugin classes:', result ? 'yes' : 'no');

        if (!result) {
            console.log('Available classes:');
            sourceFile.forEachChild((node) => {
                if (ts.isClassDeclaration(node) && node.name) {
                    console.log('- Class:', node.name.text);
                    console.log(
                        '  Can have decorators:',
                        ts.canHaveDecorators(node)
                    );
                    const decorators = ts.getDecorators(node);
                    if (decorators) {
                        console.log(
                            '  Decorators:',
                            decorators
                                .map((d: ts.Decorator) =>
                                    d.expression.getText()
                                )
                                .join(', ')
                        );
                        decorators.forEach((d) => {
                            if (ts.isCallExpression(d.expression)) {
                                console.log(
                                    '  Expression type:',
                                    d.expression.expression.getText()
                                );
                                console.log(
                                    '  Arguments:',
                                    d.expression.arguments.map((a) =>
                                        a.getText()
                                    )
                                );
                            }
                        });
                    }
                }
            });
            console.log('Program options:', this.program.getCompilerOptions());
            throw new Error('No plugin class found');
        }

        const { pluginClass, metadata } = result;

        // Get extension metadata from all classes in the file
        const extensions = this.findAllExtensionMetadata(sourceFile);
        if (extensions.length > 0) {
            metadata.extensions = metadata.extensions || [];
            metadata.extensions.push(...extensions);
        }

        // Add class name from the plugin class itself
        return orderManifestFields({
            ...metadata,
            class: pluginClass.name?.text || '',
        });
    }

    /**
     * Generates a collection manifest for multiple plugins
     */
    async generateCollection(
        options: GenerateCollectionOptions
    ): Promise<CollectionManifest> {
        // Group plugins by their remote config
        const remoteGroups = new Map<
            string,
            {
                remote: RemoteConfig;
                definitions: PluginManifest[];
            }
        >();

        // Process each plugin
        await Promise.all(
            options.pluginSources.map(async (source) => {
                const generator = new ManifestGenerator({
                    tsConfigPath: this.options.tsConfigPath,
                    pluginPath: source.sourcePath,
                });

                const manifest = await generator.generateManifest();
                if (!manifest) return;

                // Remove extensionPoints and prepare the definition
                const {
                    extensionPoints: _,
                    ...manifestWithoutExtensionPoints
                } = manifest;

                // Create a key for the remote config
                const remoteKey = JSON.stringify(source.remote);

                // Get or create the group for this remote config
                let group = remoteGroups.get(remoteKey);
                if (!group) {
                    group = {
                        remote: source.remote,
                        definitions: [],
                    };
                    remoteGroups.set(remoteKey, group);
                }

                // Add this plugin's definition to the group
                group.definitions.push(
                    orderManifestFields({
                        ...manifest,
                        class: manifest.class,
                    })
                );
            })
        );

        // Convert the grouped plugins to the final format
        return orderManifestFields({
            name: options.name,
            plugins: Array.from(remoteGroups.values()).map((group) => ({
                remote: group.remote,
                definitions: group.definitions.map((def) =>
                    orderManifestFields(def)
                ),
            })),
        });
    }

    private findPluginClass(sourceFile: ts.SourceFile): {
        pluginClass: ts.ClassDeclaration;
        metadata: PluginMetadataType;
    } {
        const pluginClasses: {
            pluginClass: ts.ClassDeclaration;
            metadata: PluginMetadataType;
        }[] = [];

        console.log('Starting class search...');

        const visit = (node: ts.Node) => {
            if (ts.isClassDeclaration(node)) {
                console.log('Found class:', node.name?.getText());
                const decorators = ts.getDecorators(node);
                if (decorators && decorators.length > 0) {
                    console.log(
                        'Class has decorators:',
                        decorators
                            .map((d: ts.Decorator) => {
                                const text = d.expression.getText();
                                console.log('Decorator expression:', text);
                                return text;
                            })
                            .join(', ')
                    );

                    const metadata = this.getPluginMetadata(node);
                    console.log('Metadata found:', metadata ? 'yes' : 'no');
                    if (metadata) {
                        pluginClasses.push({ pluginClass: node, metadata });
                    }
                } else {
                    console.log('Class has no decorators');
                }
            }
            ts.forEachChild(node, visit);
        };

        visit(sourceFile);

        if (pluginClasses.length > 1) {
            const classNames = pluginClasses
                .map((pc) => pc.pluginClass.name?.text)
                .join(', ');
            throw new Error(
                `Multiple plugin classes found in a single file: ${classNames}. Only one plugin class per file is allowed.`
            );
        }

        if (pluginClasses.length === 0) {
            throw new Error('No plugin class found');
        }

        return pluginClasses[0];
    }

    private findAllExtensionMetadata(
        sourceFile: ts.SourceFile
    ): ExtensionMetadata[] {
        const extensions: ExtensionMetadata[] = [];

        const visit = (node: ts.Node) => {
            if (ts.isClassDeclaration(node)) {
                // Check if this class has PluginMetadata
                const pluginMetadata = this.getPluginMetadata(node);
                if (pluginMetadata) {
                    // Check if it also has ExtensionMetadata
                    const extensionMetadata = this.getExtensionMetadata(node);
                    if (extensionMetadata.length > 0) {
                        throw new Error(
                            `Plugin class '${node.name?.text}' cannot have both @PluginMetadata and @ExtensionMetadata decorators`
                        );
                    }
                } else {
                    // Only collect extension metadata from non-plugin classes
                    const classExtensions = this.getExtensionMetadata(node);
                    extensions.push(...classExtensions);
                }
            }
            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return extensions;
    }

    private getPluginMetadata(
        node: ts.ClassDeclaration
    ): PluginMetadataType | undefined {
        if (!ts.canHaveDecorators(node)) return undefined;
        const decorators = ts.getDecorators(node);
        if (!decorators) return undefined;

        for (const decorator of decorators) {
            if (!ts.isCallExpression(decorator.expression)) continue;

            const decoratorName = decorator.expression.expression.getText();
            if (decoratorName !== 'PluginMetadata') continue;

            if (decorator.expression.arguments.length !== 1) continue;
            const arg = decorator.expression.arguments[0];
            if (!ts.isObjectLiteralExpression(arg)) continue;

            return this.parseObjectLiteral(arg);
        }

        return undefined;
    }

    private getExtensionMetadata(
        node: ts.ClassDeclaration
    ): ExtensionMetadata[] {
        if (!ts.canHaveDecorators(node)) return [];
        const decorators = ts.getDecorators(node);
        if (!decorators) return [];

        const extensions: ExtensionMetadata[] = [];

        for (const decorator of decorators) {
            if (!ts.isCallExpression(decorator.expression)) continue;

            const decoratorName = decorator.expression.expression.getText();
            if (decoratorName !== 'ExtensionMetadata') continue;

            if (decorator.expression.arguments.length !== 1) continue;
            const arg = decorator.expression.arguments[0];
            if (!ts.isObjectLiteralExpression(arg)) continue;

            extensions.push(this.parseObjectLiteral(arg));
        }

        return extensions;
    }

    private parseObjectLiteral(obj: ts.ObjectLiteralExpression): any {
        const result: any = {};
        for (const prop of obj.properties) {
            if (!ts.isPropertyAssignment(prop)) continue;

            const propName = prop.name.getText();
            const propValue = prop.initializer;

            if (ts.isStringLiteral(propValue)) {
                result[propName] = propValue.text;
            } else if (ts.isNumericLiteral(propValue)) {
                result[propName] = Number(propValue.text);
            } else if (ts.isArrayLiteralExpression(propValue)) {
                result[propName] = this.parseArrayLiteral(propValue);
            } else if (ts.isObjectLiteralExpression(propValue)) {
                result[propName] = this.parseObjectLiteral(propValue);
            }
        }
        return result;
    }

    private parseArrayLiteral(array: ts.ArrayLiteralExpression): any[] {
        return array.elements
            .map((element) => {
                if (ts.isObjectLiteralExpression(element)) {
                    return this.parseObjectLiteral(element);
                } else if (ts.isStringLiteral(element)) {
                    return element.text;
                } else if (ts.isNumericLiteral(element)) {
                    return Number(element.text);
                }
                return null;
            })
            .filter(Boolean);
    }

    /**
     * Gets the relative path of a source file
     *
     * @param sourcePath Source file path
     * @param projectPath Optional project path
     * @returns Relative path of the source file
     */
    private getRelativePath(sourcePath: string, projectPath?: string): string {
        return path.relative(
            projectPath || path.dirname(sourcePath),
            sourcePath
        );
    }
}

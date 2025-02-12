/**
 * Plugin Manifest Generator
 * 
 * This module provides functionality to generate plugin manifests by analyzing TypeScript source files.
 * It uses the TypeScript Compiler API to extract metadata from plugin classes decorated with @PluginMetadata.
 */

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { PluginManifest, PluginMetadataType, CollectionManifest, RemoteConfig } from './types';

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
 * ManifestGenerator class handles the generation of plugin manifests by analyzing TypeScript source files.
 * It uses the TypeScript Compiler API to extract metadata from decorated plugin classes.
 */
export class ManifestGenerator {
    /**
     * TypeScript program instance
     */
    private program: ts.Program;
    /**
     * TypeScript type checker instance
     */
    private typeChecker: ts.TypeChecker;

    /**
     * Creates a new ManifestGenerator instance
     * 
     * @param sourcePaths Array of source file paths
     * @param projectPath Optional project path for relative paths
     */
    constructor(sourcePaths: string[], projectPath?: string) {
        const configPath = ts.findConfigFile(
            projectPath || path.dirname(sourcePaths[0]),
            fs.existsSync,
            'tsconfig.json'
        );

        if (!configPath) {
            throw new Error('Could not find a valid tsconfig.json.');
        }

        const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
        const { options, errors } = ts.parseJsonConfigFileContent(
            config,
            ts.sys,
            path.dirname(configPath)
        );

        if (errors.length > 0) {
            throw new Error(`Error parsing tsconfig.json: ${errors.map(e => e.messageText).join(', ')}`);
        }

        console.log('TypeScript configuration:');
        console.log(options);

        // Add compiler options needed for decorator metadata
        const compilerOptions: ts.CompilerOptions = {
            ...options,
            noEmit: true,
            declaration: false,
            target: ts.ScriptTarget.ESNext,
            module: ts.ModuleKind.NodeNext,
            moduleResolution: ts.ModuleResolutionKind.NodeNext,
            jsx: ts.JsxEmit.None,
            allowJs: false,
            resolveJsonModule: true
        };

        console.log('Final compiler options:', compilerOptions);

        // Create program with all source files
        const program = ts.createProgram(sourcePaths, compilerOptions);
        const diagnostics = ts.getPreEmitDiagnostics(program);

        if (diagnostics.length > 0) {
            console.log('TypeScript diagnostics:', diagnostics.map(d => d.messageText));
        }

        console.log('Source files:', sourcePaths);
        const sourceFiles = program.getSourceFiles();
        console.log('Loaded source files:', sourceFiles.map(f => f.fileName));

        if (diagnostics.length > 0) {
            const messages = diagnostics.map(d => {
                const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
                if (d.file) {
                    const { line, character } = d.file.getLineAndCharacterOfPosition(d.start!);
                    return `${d.file.fileName} (${line + 1},${character + 1}): ${message}`;
                }
                return message;
            });
            console.error('TypeScript compilation errors:', messages.join('\n'));
        }

        this.program = program;
        this.typeChecker = program.getTypeChecker();
    }

    /**
     * Generates a manifest for a single plugin
     * 
     * @param options GenerateOptions instance
     * @returns Plugin metadata instance or null if generation fails
     */
    generate(options: GenerateOptions): PluginMetadataType | null {
        const sourceFile = this.program.getSourceFile(options.sourcePath);
        if (!sourceFile) {
            throw new Error(`Could not load source file: ${options.sourcePath}`);
        }

        const { pluginClass, metadata } = this.findPluginClass(sourceFile);
        if (!pluginClass) {
            return null;
        }

        return metadata;
    }

    /**
     * Generates a collection manifest for multiple plugins
     * 
     * @param options GenerateCollectionOptions instance
     * @returns CollectionManifest instance
     */
    public generateCollection(options: GenerateCollectionOptions): CollectionManifest {
        const plugins = options.pluginSources.map(source => {
            const manifest = this.generate({
                sourcePath: source.sourcePath,
                projectPath: options.projectPath
            });
            
            if (!manifest) {
                return {
                    remote: source.remote,
                    definitions: []
                };
            }
            
            // Only remove extensionPoints from collection manifest
            const { extensionPoints: _, ...manifestWithoutExtensionPoints } = manifest;
            
            return {
                remote: source.remote,
                definitions: [manifestWithoutExtensionPoints].filter(Boolean) as PluginMetadataType[]
            };
        });

        return {
            name: options.name,
            plugins
        };
    }

    /**
     * Finds a plugin class in a source file
     * 
     * @param sourceFile Source file instance
     * @returns Plugin class instance and metadata or null if not found
     */
    private findPluginClass(sourceFile: ts.SourceFile): { pluginClass: ts.ClassDeclaration, metadata: PluginMetadataType } {
        const pluginClasses: { pluginClass: ts.ClassDeclaration, metadata: PluginMetadataType }[] = [];
        
        const visit = (node: ts.Node) => {
            if (ts.isClassDeclaration(node) && node.name) {
                console.log(`Found class: ${node.name.text}`);
                
                // Check if class has @PluginMetadata decorator
                const pluginMetadata = this.getPluginMetadata(node);
                if (pluginMetadata) {
                    console.log(`Found plugin class: ${node.name.text}`);
                    pluginClasses.push({ 
                        pluginClass: node,
                        metadata: pluginMetadata
                    });
                }
            }
            ts.forEachChild(node, visit);
        };

        visit(sourceFile);

        if (pluginClasses.length > 1) {
            const classNames = pluginClasses.map(pc => pc.pluginClass.name?.text).join(', ');
            throw new Error(`Multiple plugin classes found in a single file: ${classNames}. Only one plugin class per file is allowed.`);
        }

        if (pluginClasses.length === 0) {
            throw new Error(`No plugin class found in ${sourceFile.fileName}`);
        }

        return pluginClasses[0];
    }

    /**
     * Gets the plugin metadata from a class declaration
     * 
     * @param node Class declaration instance
     * @returns Plugin metadata instance or undefined if not found
     */
    private getPluginMetadata(node: ts.ClassDeclaration): PluginMetadataType | undefined {
        if (!ts.canHaveDecorators(node)) return undefined;
        const decorators = ts.getDecorators(node);
        if (!decorators) return undefined;

        let pluginMetadata: Partial<PluginMetadataType> | undefined;
        let extensionMetadata: any | undefined;

        for (const decorator of decorators) {
            if (!ts.isCallExpression(decorator.expression)) continue;

            const signature = this.typeChecker.getResolvedSignature(decorator.expression);
            if (!signature) continue;

            const declaration = signature.declaration;
            if (!declaration || !ts.isMethodDeclaration(declaration) && !ts.isFunctionDeclaration(declaration)) continue;

            const name = declaration.name?.getText();
            if (name !== 'PluginMetadata' && name !== 'ExtensionMetadata') continue;

            const arg = decorator.expression.arguments[0];
            if (!ts.isObjectLiteralExpression(arg)) continue;

            const metadata: any = {};
            
            for (const prop of arg.properties) {
                if (!ts.isPropertyAssignment(prop)) continue;
                
                const propName = prop.name.getText();
                const propValue = prop.initializer;
                
                if (ts.isStringLiteral(propValue)) {
                    metadata[propName] = propValue.text;
                } else if (ts.isArrayLiteralExpression(propValue)) {
                    metadata[propName] = this.parseArrayLiteral(propValue);
                } else if (ts.isObjectLiteralExpression(propValue)) {
                    metadata[propName] = this.parseObjectLiteral(propValue);
                }
            }

            if (name === 'PluginMetadata') {
                pluginMetadata = metadata;
            } else if (name === 'ExtensionMetadata') {
                extensionMetadata = metadata;
            }
        }

        if (!pluginMetadata) return undefined;

        if (extensionMetadata) {
            pluginMetadata.extensions = [extensionMetadata];
        }

        return pluginMetadata as PluginMetadataType;
    }

    private parseArrayLiteral(array: ts.ArrayLiteralExpression): any[] {
        return array.elements.map(element => {
            if (ts.isObjectLiteralExpression(element)) {
                return this.parseObjectLiteral(element);
            } else if (ts.isStringLiteral(element)) {
                return element.text;
            } else if (ts.isNumericLiteral(element)) {
                return Number(element.text);
            }
            return null;
        }).filter(Boolean);
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

    /**
     * Gets the relative path of a source file
     * 
     * @param sourcePath Source file path
     * @param projectPath Optional project path
     * @returns Relative path of the source file
     */
    private getRelativePath(sourcePath: string, projectPath?: string): string {
        return path.relative(projectPath || path.dirname(sourcePath), sourcePath);
    }
}

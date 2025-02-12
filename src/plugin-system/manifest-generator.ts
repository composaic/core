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

        const pluginClass = this.findPluginClass(sourceFile);
        if (!pluginClass) {
            return null;
        }

        const metadata = this.extractMetadata(pluginClass);
        if (!metadata) {
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
            
            // Remove extensionPoints from collection manifest
            const { extensionPoints, ...manifestWithoutExtensionPoints } = manifest;
            
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
     * @returns Plugin class instance or null if not found
     */
    private findPluginClass(sourceFile: ts.SourceFile): ts.ClassDeclaration | null {
        let pluginClasses: ts.ClassDeclaration[] = [];
        console.log(`Searching for plugin class in ${sourceFile.fileName}`);

        const visit = (node: ts.Node) => {
            if (ts.isClassDeclaration(node)) {
                console.log(`Found class: ${node.name?.getText()}`);
                if (this.hasPluginDecorator(node)) {
                    console.log(`Found plugin class: ${node.name?.getText()}`);
                    pluginClasses.push(node);
                }
            }
            ts.forEachChild(node, visit);
        };

        ts.forEachChild(sourceFile, visit);
        
        if (pluginClasses.length > 1) {
            const classNames = pluginClasses.map(c => c.name?.getText()).join(', ');
            throw new Error(
                `Multiple plugin classes found in ${sourceFile.fileName}. ` +
                `Found plugins: ${classNames}. Each plugin should be in its own file. ` +
                `Note: Extension classes (those without @PluginMetadata) can coexist with a plugin.`
            );
        }

        return pluginClasses[0] || null;
    }

    /**
     * Checks if a class has the @PluginMetadata decorator
     * 
     * @param node Class declaration instance
     * @returns True if the class has the @PluginMetadata decorator, false otherwise
     */
    private hasPluginDecorator(node: ts.ClassDeclaration): boolean {
        if (!ts.canHaveDecorators(node)) return false;
        const decorators = ts.getDecorators(node);
        if (!decorators) return false;

        const pluginDecorator = decorators.find((decorator: ts.Decorator) => {
            const expression = decorator.expression;
            if (!ts.isCallExpression(expression)) return false;
            
            const identifier = expression.expression;
            if (!ts.isIdentifier(identifier)) return false;
            
            return identifier.text === 'PluginMetadata';
        });

        return !!pluginDecorator;
    }

    /**
     * Extracts metadata from a plugin class
     * 
     * @param classNode Plugin class instance
     * @returns Plugin metadata instance or null if extraction fails
     */
    private extractMetadata(classNode: ts.ClassDeclaration): PluginMetadataType | null {
        if (!ts.canHaveDecorators(classNode)) return null;
        const decorators = ts.getDecorators(classNode);
        if (!decorators) return null;

        // Find the @PluginMetadata decorator
        const pluginDecorator = decorators.find((decorator: ts.Decorator) => {
            const expression = decorator.expression;
            if (!ts.isCallExpression(expression)) return false;
            
            const identifier = expression.expression;
            if (!ts.isIdentifier(identifier)) return false;
            
            return identifier.text === 'PluginMetadata';
        });

        if (!pluginDecorator) return null;

        // Get the plugin metadata from the decorator arguments
        const decoratorCall = pluginDecorator.expression as ts.CallExpression;
        const arg = decoratorCall.arguments[0];
        if (!ts.isObjectLiteralExpression(arg)) return null;

        // Extract the plugin metadata
        const metadata = this.extractObjectLiteral(arg) as PluginMetadataType;

        // Find the @ExtensionMetadata decorator
        const extensionDecorator = decorators.find((decorator: ts.Decorator) => {
            const expression = decorator.expression;
            if (!ts.isCallExpression(expression)) return false;
            
            const identifier = expression.expression;
            if (!ts.isIdentifier(identifier)) return false;
            
            return identifier.text === 'ExtensionMetadata';
        });

        if (extensionDecorator) {
            const extensionCall = extensionDecorator.expression as ts.CallExpression;
            const extensionArg = extensionCall.arguments[0];
            if (ts.isObjectLiteralExpression(extensionArg)) {
                const extensionMetadata = this.extractObjectLiteral(extensionArg);
                metadata.extensions = [extensionMetadata];
            }
        }

        // Find the @ExtensionPointMetadata decorator
        const extensionPointDecorator = decorators.find((decorator: ts.Decorator) => {
            const expression = decorator.expression;
            if (!ts.isCallExpression(expression)) return false;
            
            const identifier = expression.expression;
            if (!ts.isIdentifier(identifier)) return false;
            
            return identifier.text === 'ExtensionPointMetadata';
        });

        if (extensionPointDecorator) {
            const extensionPointCall = extensionPointDecorator.expression as ts.CallExpression;
            const extensionPointArg = extensionPointCall.arguments[0];
            if (ts.isArrayLiteralExpression(extensionPointArg)) {
                metadata.extensionPoints = extensionPointArg.elements
                    .filter(ts.isObjectLiteralExpression)
                    .map(element => this.extractObjectLiteral(element));
            }
        }

        return metadata;
    }

    /**
     * Extracts an object literal expression
     * 
     * @param node Object literal expression instance
     * @returns Extracted object literal
     */
    private extractObjectLiteral(node: ts.ObjectLiteralExpression): any {
        const result: any = {};
        
        for (const property of node.properties) {
            if (!ts.isPropertyAssignment(property)) continue;
            
            const name = property.name.getText();
            const initializer = property.initializer;
            
            if (ts.isStringLiteral(initializer)) {
                result[name] = initializer.text;
            } else if (ts.isNumericLiteral(initializer)) {
                result[name] = Number(initializer.text);
            } else if (initializer.kind === ts.SyntaxKind.TrueKeyword) {
                result[name] = true;
            } else if (initializer.kind === ts.SyntaxKind.FalseKeyword) {
                result[name] = false;
            } else if (ts.isArrayLiteralExpression(initializer)) {
                result[name] = initializer.elements.map(element => {
                    if (ts.isObjectLiteralExpression(element)) {
                        return this.extractObjectLiteral(element);
                    }
                    return null;
                }).filter(Boolean);
            } else if (ts.isObjectLiteralExpression(initializer)) {
                result[name] = this.extractObjectLiteral(initializer);
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

# Local Plugin Manifest Generation

This document describes the enhanced plugin manifest build utility that now supports three types of plugins:

## Plugin Types

### 1. System Plugins

- **Purpose**: Core framework plugins shipped with @composaic/core
- **Location**: `src/plugins/impl/`
- **Manifest Output**: Individual manifest files specified in config
- **Example**: Logger, Signals plugins

### 2. Local Plugins (NEW)

- **Purpose**: Developer-created plugins in their own applications
- **Location**: Any directory containing TypeScript files with `@PluginMetadata` decorators
- **Manifest Output**: `[plugin-id].manifest.json` files next to each plugin
- **Use Case**: For convenient local plugin development with decorators

### 3. Application Plugins

- **Purpose**: Remote federated plugins for micro-frontend consumption
- **Location**: Various sources
- **Manifest Output**: Collective manifest files for remote loading
- **Use Case**: Plugin federation across multiple applications

## Local Plugin Configuration

### Basic Configuration

```javascript
/** @type {import('./src/plugin-system/config-types').PluginManifestConfig} */
module.exports = {
    plugins: [
        {
            type: 'local',
            source: '../examples/textprocessor/src/plugins',
            tsconfig: '../examples/textprocessor/tsconfig.json',
            // outputDir: './manifests', // Optional: custom output directory
        },
    ],
};
```

### Directory Scanning

When `source` is a directory, the system recursively scans for TypeScript files containing `@PluginMetadata` decorators and generates individual manifest files.

### Individual Files

You can also specify individual plugin files:

```javascript
{
    type: 'local',
    source: '../examples/textprocessor/src/plugins/casetransform/CaseTransformPlugin.ts',
    tsconfig: '../examples/textprocessor/tsconfig.json',
}
```

## Generated Manifests

Local plugins generate manifests like `casetransform.manifest.json`:

```json
{
    "package": "@composaic/examples",
    "module": "casetransform",
    "class": "CaseTransformPlugin",
    "plugin": "casetransform",
    "version": "1.0.0",
    "description": "Text case transformation processors",
    "extensions": [
        {
            "plugin": "textprocessor",
            "id": "textprocessor.extension",
            "className": "UpperCaseProcessor"
        }
    ]
}
```

## Usage

### Via npm script:

```bash
npm run build:local-manifests -- --dir ../examples/textprocessor/src/plugins
```

### Via CLI directly:

```bash
node dist/cjs/plugin-system/cli.js generate --config example-local-plugin.config.js
```

### Via standalone script:

```bash
node scripts/generate-local-plugin-manifests.js --dir ../examples/textprocessor/src/plugins
```

## Features

- **Automatic Discovery**: Scans directories for files with `@PluginMetadata` decorators
- **Extension Collection**: Automatically includes `@ExtensionMetadata` from the same file
- **Timestamp Checking**: Only regenerates manifests when source files are newer
- **Flexible Output**: Manifests generated next to plugins or in custom directory
- **TypeScript Support**: Full TypeScript compilation and decorator analysis

This enhancement makes it convenient to work with local plugins using decorators, with individual manifest files that can be used to create plugin modules.

# Plugin Types in Composaic

The Composaic plugin system supports two types of plugins:

## 1. Local Plugins

- **Purpose**: Plugins that are part of your local codebase
- **Manifest**: Generated next to the plugin source file as `[plugin-id].manifest.json`
- **Use Cases**:
    - Core framework plugins (like logger, signals)
    - Application-specific plugins
    - Development and testing plugins
- **Configuration**:

```javascript
{
    type: 'local',
    source: 'path/to/plugin.ts',
    tsconfig: 'path/to/tsconfig.json'
}
```

## 2. Remote Plugins

- **Purpose**: Federated plugins loaded from remote locations
- **Manifest**: Collective manifest file in public directory
- **Use Cases**:
    - Micro-frontend components
    - Shared plugins across applications
    - Plugin marketplace distribution
- **Configuration**:

```javascript
{
    type: 'remote',
    collective: {
        name: '@scope/plugin-collection',
        output: 'public/plugins-manifest.json',
        plugins: [{
            source: 'path/to/plugin.ts',
            remote: {
                url: 'https://plugins.example.com/plugin',
                bundleFile: 'plugin.js'
            }
        }]
    }
}
```

## Key Changes

- Simplified from three types (system, local, application) to two (local, remote)
- Local plugins always generate manifests next to their source files
- Core framework plugins (previously "system") are now local plugins
- Remote plugins (previously "application") remain unchanged but renamed for clarity

## Migration

To migrate from the old system:

1. Convert system plugins to local plugins
2. Remove any outputDir configurations (manifests are always next to source)
3. Rename application plugin configs to remote
4. Update plugin references in your code to use the new types

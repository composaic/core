# Decorator Syntax Changes with New Types

## Current Decorator Usage:

```typescript
@PluginMetadata({
    plugin: '@composaic/logger',
    version: '0.1.0',
    description: 'Logger Plugin',
    module: 'index',
    package: 'logger',
    extensionPoints: [{
        id: 'logger',
        type: 'LoggerExtensionPoint'
    }]
})

@ExtensionMetadata({
    plugin: 'self',
    id: 'logger',
    className: 'SimpleLoggerExtension'
})
```

## With Updated Types:

```typescript
// The decorator input matches PluginManifestPluginDefinition type:
@PluginMetadata({
    plugin: '@composaic/logger',    // String
    version: '0.1.0',              // String
    description: 'Logger Plugin',   // String
    module: 'index',               // String
    package: 'logger',             // String
    extensionPoints: [{            // Optional(Array(PluginManifestExtensionPoints))
        id: 'logger',              // String
        type: 'LoggerExtensionPoint' // String
    }]
})

// The decorator input matches PluginManifestExtension type:
@ExtensionMetadata({
    plugin: 'self',                // String
    id: 'logger',                 // String
    className: 'SimpleLoggerExtension' // String
    // meta is optional: Optional(Array(Unknown))
})
```

## Key Changes:

1. All fields are now strictly typed using runtypes:

    - Strings are validated using `String` type
    - Optional fields use `Optional` type
    - Arrays use `Array` type
    - Additional properties are allowed via `Unknown` type

2. Validation Changes:

    - Runtime validation is now more precise with `Object` type
    - TypeScript will enforce these types at compile time
    - Invalid types will be caught during build

3. Impact on Existing Code:
    - Existing decorator syntax remains the same
    - Only the underlying type definitions have changed
    - Better type checking and validation
    - No need to modify existing plugin code

## Example Using Types Directly:

```typescript
// If you need to create a plugin definition programmatically:
const pluginDef = PluginManifestPluginDefinition.check({
    plugin: '@composaic/logger',
    version: '0.1.0',
    description: 'Logger Plugin',
    module: 'index',
    package: 'logger',
    extensionPoints: [
        {
            id: 'logger',
            type: 'LoggerExtensionPoint',
        },
    ],
});
```

The key point is that while we've improved the type system and validation, the actual decorator syntax used in plugins remains backward compatible. Plugin authors don't need to change their code, but they get better type checking and validation for free.

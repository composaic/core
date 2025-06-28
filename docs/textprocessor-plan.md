# Text Processor Example Implementation Plan

## Overview

This document outlines the implementation plan for a text processing application using the Composaic plugin framework. The application will demonstrate plugin architecture with basic text processing capabilities and two operational modes.

## Core Components

### Plugin Structure

```typescript
// Core plugin interface with decorator
@Plugin({
  name: "TextProcessor",
  version: "1.0.0"
})
class TextProcessorPlugin {
  // Plugin implementation
}

// Base extension point with decorator
@ExtensionPoint({
  id: "TextProcessorExtension"
})
interface TextProcessorExtension {
  processText(input: string): string;
  getLabel(): string;
  getId(): string;
}

// Implementations with decorators
@Extension({
  point: "TextProcessorExtension"
})
class UpperCaseProcessor implements TextProcessorExtension {
  processText(input: string): string { return input.toUpperCase(); }
  getLabel(): string { return "Upper Case"; }
  getId(): string { return "uppercase"; }
}

@Extension({
  point: "TextProcessorExtension"
})
class LowerCaseProcessor implements TextProcessorExtension {
  processText(input: string): string { return input.toLowerCase(); }
  getLabel(): string { return "Lower Case"; }
  getId(): string { return "lowercase"; }
}

@Extension({
  point: "TextProcessorExtension"
})
class ReverseProcessor implements TextProcessorExtension {
  processText(input: string): string { return input.split('').reverse().join(''); }
  getLabel(): string { return "Reverse"; }
  getId(): string { return "reverse"; }
}
```

### Project Structure

```
/examples
  /textprocessor
    /src
      /plugins
        /textprocessor
          index.ts              # Plugin exports
          plugin-manifest.json  # Plugin descriptor
          TextProcessorPlugin.ts
          extensions/
            TextProcessorExtension.ts
            implementations/
              UpperCaseProcessor.ts
              LowerCaseProcessor.ts
              ReverseProcessor.ts
      /components
        TextProcessor.tsx       # Main UI component
        ProcessorButton.tsx     # Reusable button component
      App.tsx                  # Main app with plugin initialization
      index.tsx               # Entry point
```

## UI Layout

```
+----------------+------------------+----------------+
|                |                 |                |
|   Input Text   |   Processors    |    Output     |
|     Area       |    Buttons      |     Area      |
|                |                 |                |
|                | [Upper Case]    |                |
|                | [Lower Case]    |                |
|                | [Reverse]       |                |
|                |                 |                |
+----------------+------------------+----------------+
```

## Operational Modes

### Basic Mode

- Each processor button acts as a push button
- Clicking a button immediately processes the input text
- Result is displayed in the output area
- No state maintenance required beyond input text

### Combined Mode

- Processor buttons act as toggles
- Multiple processors can be active simultaneously
- Processing order is maintained based on activation sequence
- Live updates as text changes or processor selection changes

## Implementation Steps

1. **Setup Project Structure**
    - Create new examples directory
    - Initialize textprocessor project
    - Set up basic React application structure
    - Configure @composaic/core dependency

2. **Plugin Framework Integration**
    - Implement plugin descriptor
    - Create base extension point
    - Implement processor extensions
    - Set up plugin registration

3. **UI Components**
    - Create main layout
    - Implement processor buttons
    - Add mode toggle
    - Create input/output areas

4. **Processing Logic**
    - Implement basic mode processing
    - Implement combined mode logic
    - Add processor order tracking
    - Handle live updates

5. **Testing & Validation**
    - Test individual processors
    - Verify mode switching
    - Validate combined processing
    - Check plugin integration

## Technical Considerations

### Plugin Registration

```typescript
// Plugin initialization in App.tsx
init({
    plugins: [getTextProcessorPluginModule()],
});
```

### State Management

```typescript
interface ProcessorState {
    id: string;
    active: boolean;
    order: number;
}

interface AppState {
    input: string;
    output: string;
    mode: 'basic' | 'combined';
    processors: ProcessorState[];
}
```

### Extension Point Usage

```typescript
// Getting processor extensions
const plugin = PluginManager.getInstance().getPlugin('TextProcessor');
const processors = plugin.getConnectedExtensions();
```

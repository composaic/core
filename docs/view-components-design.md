# View Components Design Document

## Current Implementation Analysis

The current system uses:

1. ViewContainer for context and event handling
2. ViewComponent for slot-based rendering
3. Plugin metadata for component registration

Example (from Example1Page.tsx):

```typescript
<ViewContainer id="sample.container">
  <ViewComponent slot="master" />
  <ViewComponent slot="detail" />
</ViewContainer>
```

Component resolution through plugin metadata:

```typescript
@ExtensionMetadata({
  plugin: '@composaic/views',
  id: 'views',
  className: 'SimpleViewsExtension',
  meta: [{
    container: 'sample.container',
    components: [{
      slot: 'detail',
      component: 'PluginTestComponent'
    }]
  }]
})
```

## Proposed Design: Initial Unified Component

Create a single ViewComponent that combines container and component functionality:

```typescript
interface ViewComponentProps {
  id?: string;                 // Container ID (if component provides context)
  slot?: string;               // Slot name (if component fills a slot)
}

export class ViewComponent extends React.Component<ViewComponentProps> {
  // Messaging system
  private handlers = new Map<string, Set<(msg: ViewMessage) => void>>();

  constructor(props: ViewComponentProps) {
    super(props);
    this.state = {
      loading: props.slot ? true : false,
      error: null,
      resolvedComponent: null
    };
  }

  // Messaging System
  public emit = (msg: ViewMessage) => {
    const handlers = this.handlers.get(this.props.id);
    if (handlers) {
      handlers.forEach(h => h(msg));
    } else {
      // Bubble up to parent context if no local handlers
      this.context?.emit(msg);
    }
  }

  public on = (handler: (msg: ViewMessage) => void) => {
    if (!this.props.id) return () => {};

    if (!this.handlers.has(this.props.id)) {
      this.handlers.set(this.props.id, new Set());
    }

    const handlers = this.handlers.get(this.props.id)!;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(this.props.id!);
      }
    };
  }

  // Component Resolution
  private async resolveComponent() {
    if (!this.props.slot) return;

    try {
      const viewsPlugin = await PluginManager.getInstance()
        .getPlugin('@composaic/views') as ViewsPlugin;

      if (!viewsPlugin) {
        throw new Error('Views plugin not found');
      }

      // Get parent container ID
      const containerElement = document.querySelector('[data-view-container]');
      const containerId = containerElement?.getAttribute('data-view-container');
      if (!containerId) {
        throw new Error('No container ID found');
      }

      // Get view definition
      const views = viewsPlugin.getViewsByContainer(containerId);
      if (!views) {
        throw new Error(`No views found for container: ${containerId}`);
      }

      // Find component for this slot
      const slotComponent = views.components.find(
        ({component}) => component.slot === this.props.slot
      );
      if (!slotComponent) {
        throw new Error(`No component found for slot: ${this.props.slot}`);
      }

      // Load component through plugin system
      const pluginInstance = await PluginManager.getInstance()
        .getPlugin(slotComponent.plugin);

      if (!pluginInstance) {
        throw new Error(`Plugin not found: ${slotComponent.plugin}`);
      }

      const Component = pluginInstance.getModule(
        slotComponent.component.component
      ) as React.FC;

      if (!Component) {
        throw new Error(
          `Component not found: ${slotComponent.component.component}`
        );
      }

      this.setState({
        resolvedComponent: Component,
        loading: false
      });
    } catch (error) {
      this.setState({ error, loading: false });
    }
  }

  // Lifecycle
  componentDidMount() {
    if (this.props.slot) {
      this.resolveComponent();
    }
  }

  // Rendering
  render() {
    const { id, slot } = this.props;
    const { loading, error, resolvedComponent: Component } = this.state;

    // Error state
    if (error) {
      return <div>Error: {error.message}</div>;
    }

    // Container mode (provides context)
    if (id) {
      return (
        <ViewContext.Provider value={{ emit: this.emit, on: this.on }}>
          <div data-view-container={id} />
        </ViewContext.Provider>
      );
    }

    // Component in slot mode
    if (slot) {
      if (loading) {
        return <div>Loading...</div>;
      }

      return Component ? (
        <div data-slot={slot}>
          <Component />
        </div>
      ) : null;
    }

    return null;
  }
}
```

### Usage (Current Pattern)

```typescript
// Example page stays exactly the same
<ViewComponent id="sample.container">
  <ViewComponent slot="master" />
  <ViewComponent slot="detail" />
</ViewComponent>
```

### Next Steps

1. A future task will enhance this to support slot-based composition, where:
    - Components can define multiple slots
    - Extension metadata will support nested slot definitions
    - Components can fill slots with components that have their own slots
    - No direct children needed since composition is through slots

### Key Benefits

1. Single Component Class

    - Combines container and component functionality
    - Maintains current usage patterns
    - Simpler mental model
    - Better code organization

2. Preserved Features

    - Same plugin integration
    - Identical component resolution
    - Current event system
    - Existing error handling

3. Foundation for Enhancement
    - Ready for slot-based composition
    - Clean separation of concerns
    - Plugin-driven composition
    - Type-safe metadata

### Migration Strategy

1. Create Unified Component

    - Implement basic functionality
    - Match current behavior
    - Keep existing interfaces

2. Test Current Usage

    - Verify example page
    - Test plugin loading
    - Validate events
    - Check error cases

3. Remove Old Code
    - Replace ViewContainer
    - Replace ViewComponent
    - Update imports
    - Clean up types

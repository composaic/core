# ViewComponent Rendering Fixes

## Problem Statement

The ViewComponent in the detail slot experiences rendering issues:

- Does not render when clicking menu item to open the page
- Only renders after clicking in master table
- Fails to render on direct reload of example1 route

## Implementation Plan

### 1. Context and State Management

- Move EventBus to useRef in Example1Page
- Add proper loading states
- Implement proper cleanup of event listeners

### 2. Component Loading

```typescript
// ViewComponent modifications
const ViewComponent: React.FC<ViewComponentProps> = ({ slot }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadComponent() {
      try {
        setLoading(true);
        // Load component with proper error handling
        ...
      } catch (err) {
        if (isMounted) setError(err as Error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadComponent();
    return () => { isMounted = false; };
  }, [context, slot]);
}
```

### 3. Loading States and Error Handling

```typescript
if (loading) return <div>Loading component...</div>;
if (error) return <div>Error loading component: {error.message}</div>;
if (!Component || !eventBus) return <div>Component not available</div>;
```

### 4. Plugin Manager Integration

```typescript
const loadPlugins = async () => {
    const viewsPlugin =
        await PluginManager.getInstance().getPlugin('@composaic/views');
    if (!viewsPlugin) throw new Error('Views plugin not found');

    const containerViews = await viewsPlugin.getViewsByContainer(context);
    if (!containerViews) throw new Error('No views found for container');
};
```

## Implementation Steps

1. Update Example1Page with EventBus improvements
2. Enhance ViewComponent with loading states and error handling
3. Improve plugin loading process
4. Add cleanup and lifecycle management

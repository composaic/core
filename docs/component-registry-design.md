# Pluggable Components Design

## Overview

The Pluggable Components plugin provides a mechanism for dynamically loading and resolving React components through the plugin system. Components can be provided by any plugin and loaded at runtime based on their unique identifiers.

## Core Types

```typescript
import { z } from 'zod';

// Component property definitions
export type ComponentDefinition = {
    component: string;
    plugin: string;
    propsSchema: z.ZodType<any>;
    meta?: {
        version?: string;
        category?: string;
        [key: string]: any;
    };
};

export type PluginComponentDefinition = {
    id: string;
    component: string;
    propsSchema: z.ZodType<any>;
    meta?: {
        version?: string;
        category?: string;
        [key: string]: any;
    };
};
```

## Extension Point

```typescript
export interface PluggableComponentProvider {
    getComponentDefinitions(): PluginComponentDefinition[];
}
```

## Plugin Implementation

```typescript
@PluginMetadata({
    plugin: '@composaic/pluggable-components',
    version: '0.1.0',
    description: 'Plugin for dynamic component loading',
    module: 'index',
    package: 'pluggable-components',
    extensionPoints: [
        {
            id: 'component',
            type: 'PluggableComponentProvider',
        },
    ],
})
export class PluggableComponentsPlugin extends Plugin {
    // One implementation per component ID
    private components: { [key: string]: ComponentDefinition } = {};

    async start() {
        console.log(
            '[PluggableComponentsPlugin] Starting plugin initialization'
        );
        super.start();
        await this.initializeComponents();
        console.log(
            '[PluggableComponentsPlugin] Plugin initialization complete'
        );
    }

    private async initializeComponents() {
        this.components = {};

        const extensions = this.getConnectedExtensions('component');

        extensions.forEach((extension) => {
            const componentMeta = extension.meta as PluginComponentDefinition[];
            componentMeta.forEach((def) => {
                // Last registered implementation wins
                this.components[def.id] = {
                    component: def.component,
                    plugin: extension.plugin,
                    propsSchema: def.propsSchema,
                    meta: def.meta,
                };

                console.log(
                    `[PluggableComponentsPlugin] Registered component ${def.id} from plugin ${extension.plugin}`
                );
            });
        });
    }

    public getComponent(id: string): ComponentDefinition | undefined {
        return this.components[id];
    }

    public validateProps(
        id: string,
        props: any
    ): { success: boolean; error?: z.ZodError } {
        const definition = this.components[id];
        if (!definition) {
            return {
                success: false,
                error: new z.ZodError([
                    {
                        code: 'custom',
                        path: [],
                        message: `Component ${id} not found`,
                    },
                ]),
            };
        }

        const result = definition.propsSchema.safeParse(props);
        return {
            success: result.success,
            error: result.success ? undefined : result.error,
        };
    }

    async stop() {
        this.components = {};
    }
}
```

## Dynamic Component Implementation

```typescript
interface DynamicComponentProps {
    id: string;
    componentProps?: Record<string, any>;
    children?: React.ReactNode;
}

export const DynamicComponent: React.FC<DynamicComponentProps> = ({
    id,
    componentProps = {},
    children
}) => {
    // Component state
    const [Component, setComponent] = useState<React.FC | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [validationError, setValidationError] = useState<z.ZodError | null>(null);
    const [pluginVersion, setPluginVersion] = useState(0);

    // Plugin change handler
    useEffect(() => {
        const unsubscribe = PluginManager.getInstance()
            .registerPluginChangeListener(
                ['@composaic/pluggable-components'],
                () => {
                    setPluginVersion(current => current + 1);
                    setLoading(true);
                    setComponent(null);
                    setError(null);
                    setValidationError(null);
                }
            );

        return () => {
            unsubscribe();
        };
    }, []);

    // Component loading
    useEffect(() => {
        let isMounted = true;

        async function loadComponent() {
            try {
                setLoading(true);
                setError(null);
                setValidationError(null);

                const registryPlugin = await PluginManager.getInstance()
                    .getPlugin('@composaic/component-registry') as ComponentRegistryPlugin;

                if (!isMounted) return;

                if (!registryPlugin) {
                    throw new Error('Component Registry plugin not found');
                }

                // Validate props
                const validation = registryPlugin.validateProps(id, componentProps);
                if (!validation.success) {
                    setValidationError(validation.error || null);
                    return;
                }

                const componentDef = registryPlugin.getComponent(id);
                if (!componentDef) {
                    throw new Error(`No component found for id: ${id}`);
                }

                const pluginInstance = await PluginManager.getInstance()
                    .getPlugin(componentDef.plugin);

                if (!isMounted) return;

                if (!pluginInstance) {
                    throw new Error(`Plugin not found: ${componentDef.plugin}`);
                }

                const ComponentToRender = pluginInstance.getModule(
                    componentDef.component
                ) as React.FC;

                if (!ComponentToRender) {
                    throw new Error(`Component not found: ${componentDef.component}`);
                }

                setComponent(() => ComponentToRender);
            } catch (err) {
                if (isMounted) {
                    setError(err as Error);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadComponent();

        return () => {
            isMounted = false;
        };
    }, [id, componentProps, pluginVersion]);

    if (loading) {
        return <div>Loading component...</div>;
    }

    if (validationError) {
        return (
            <div>
                Prop validation error:
                <pre>
                    {validationError.errors.map(err =>
                        `${err.path.join('.')}: ${err.message}`
                    ).join('\n')}
                </pre>
            </div>
        );
    }

    if (error) {
        return <div>Error loading component: {error.message}</div>;
    }

    if (!Component) {
        return null;
    }

    return (
        <Component {...componentProps}>
            {children}
        </Component>
    );
};
```

## Example Usage

### Prop Types to Schema Conversion

```typescript
// Simple conversion utility
// Property type definitions
type PropType = {
    type:
        | 'string'
        | 'number'
        | 'boolean'
        | 'enum'
        | 'function'
        | 'array'
        | 'object'
        | 'union'
        | 'literal';
    optional?: boolean;
    enum?: string[]; // for enum type
    value?: string | number | boolean; // for literal type
    args?: PropType[]; // for function type
    returns?: PropType; // for function type
    items?: PropType; // for array type
    properties?: Record<string, PropType>; // for object type
    variants?: PropType[]; // for union type
};

// Example: Two ways to define "primary" | "secondary"
type ButtonVariant = 'primary' | 'secondary';

// Approach 1: Using enum type
const enumApproach: PropType = {
    type: 'enum',
    enum: ['primary', 'secondary'],
    optional: true,
};

// Approach 2: Using union of literals (more type-safe)
const unionApproach: PropType = {
    type: 'union',
    variants: [
        { type: 'literal', value: 'primary' },
        { type: 'literal', value: 'secondary' },
    ],
    optional: true,
};

// Both approaches produce equivalent Zod schemas:
// z.enum(['primary', 'secondary']).optional()
// z.union([z.literal('primary'), z.literal('secondary')]).optional()

function createZodSchema(prop: PropType): z.ZodType {
    let schema: z.ZodType;

    switch (prop.type) {
        case 'string':
            schema = z.string();
            break;
        case 'number':
            schema = z.number();
            break;
        case 'boolean':
            schema = z.boolean();
            break;
        case 'enum':
            if (!prop.enum) {
                throw new Error('Enum type must specify enum values');
            }
            schema = z.enum(prop.enum as [string, ...string[]]);
            break;
        case 'literal':
            if (prop.value === undefined) {
                throw new Error('Literal type must specify value');
            }
            schema = z.literal(prop.value);
            break;
        case 'function':
            schema = z
                .function()
                .args(...(prop.args || []).map((arg) => createZodSchema(arg)))
                .returns(
                    prop.returns ? createZodSchema(prop.returns) : z.void()
                );
            break;
        case 'array':
            if (!prop.items)
                throw new Error('Array type must specify items type');
            schema = z.array(createZodSchema(prop.items));
            break;
        case 'object':
            if (!prop.properties)
                throw new Error('Object type must specify properties');
            const shape = Object.entries(prop.properties).reduce(
                (acc, [key, value]) => ({
                    ...acc,
                    [key]: createZodSchema(value),
                }),
                {}
            );
            schema = z.object(shape);
            break;
        case 'union':
            if (!prop.variants || prop.variants.length === 0) {
                throw new Error('Union type must specify at least one variant');
            }
            schema = z.union(prop.variants.map((v) => createZodSchema(v)));
            break;
        default:
            schema = z.any();
    }

    return prop.optional ? schema.optional() : schema;
}

// Convert property definitions to schema
function createPropsSchema(props: Record<string, any>): z.ZodObject<any> {
    const shape = Object.entries(props).reduce(
        (acc, [key, def]) => ({
            ...acc,
            [key]: createZodSchema(def),
        }),
        {}
    );

    return z.object(shape);
}
```

### Example Implementation

```typescript
// Define a component with union type prop
const Button: React.FC<{
    label: string;
    variant?: 'primary' | 'secondary';
    onClick: () => void;
}> = ({ label, variant = 'primary', onClick }) => {
    return (
        <button className={`btn btn-${variant}`} onClick={onClick}>
            {label}
        </button>
    );
};

// Register using ExtensionMetadata
@ExtensionMetadata({
    plugin: 'self',
    id: 'component',
    className: 'ButtonProvider',
    meta: [
        {
            id: 'button',
            component: 'Button',
            props: {
                label: { type: 'string' },
                // Approach 1: Using enum type
                variant: {
                    type: 'enum',
                    enum: ['primary', 'secondary'],
                    optional: true
                },
                // Alternative approach using union of literals:
                // variant: {
                //     type: 'union',
                //     variants: [
                //         { type: 'literal', value: 'primary' },
                //         { type: 'literal', value: 'secondary' }
                //     ],
                //     optional: true
                // },
                onClick: {
                    type: 'function',
                    args: [],
                    returns: { type: 'void' }
                }
            },
            meta: {
                version: '1.0.0',
                category: 'ui'
            }
        }
    ]
})
export class ButtonProvider implements PluggableComponentProvider {
    getComponentDefinitions(): PluginComponentDefinition[] {
        return [
            {
                id: 'button',
                component: 'Button',
                props: {
                    label: { type: 'string' },
                    variant: {
                        type: 'enum',
                        enum: ['primary', 'secondary'],
                        optional: true
                    },
                    onClick: {
                        type: 'function',
                        args: [],
                        returns: { type: 'void' }
                    }
                },
                meta: {
                    version: '1.0.0',
                    category: 'ui'
                }
            }
        ];
    }
}

// Usage example
const ExamplePage: React.FC = () => {
    return (
        <div>
            <DynamicComponent
                id="button"
                componentProps={{
                    label: "Click Me",
                    variant: "primary",
                    onClick: () => console.log("Clicked!")
                }}
            />
        </div>
    );
};
                                field: { type: 'string' },
                                sortable: { type: 'boolean', optional: true }
                            }
                        }
                    },
                    data: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                '[key: string]': {
                                    type: 'union',
                                    variants: [
                                        { type: 'string' },
                                        { type: 'number' }
                                    ]
                                }
                            }
                        }
                    },
                    onSort: {
                        type: 'function',
                        args: [
                            { type: 'string' },
                            { type: 'enum', enum: ['asc', 'desc'] }
                        ],
                        returns: { type: 'void' },
                        optional: true
                    },
                    config: {
                        type: 'object',
                        optional: true,
                        properties: {
                            pageSize: { type: 'number' },
                            showHeader: { type: 'boolean' }
                        }
                    }
                },
                meta: {
                    version: '1.0.0',
                    category: 'data-display'
                }
            }
        ];
    }
}

// Using the component
const ExamplePage: React.FC = () => {
    return (
        <div>
            <DynamicComponent
                id="data-grid"
                componentProps={{
                    columns: [
                        { title: "Name", field: "name" },
                        { title: "Age", field: "age", sortable: true }
                    ],
                    data: [
                        { name: "John", age: 30 },
                        { name: "Jane", age: 25 }
                    ],
                    config: {
                        pageSize: 5,
                        showHeader: true
                    }
                }}
            />
        </div>
    );
};
                        returns: "void"
                    }
                },
                meta: {
                    version: '1.0.0',
                    category: 'buttons'
                }
            }
        ];
    }
}

// Using the component
const ExamplePage: React.FC = () => {
    return (
        <div>
            <DynamicComponent
                id="fancy-button"
                componentProps={{
                    label: "Click Me",
                    variant: "primary"
                }}
            />
        </div>
    );
};
```

### 1. Plugin Registration Tests

```typescript
describe('PluggableComponentsPlugin', () => {
    let pluginManager: PluginManager;

    beforeEach(() => {
        pluginManager = PluginManager.getInstance();
        pluginManager.clear();

        // Mock LoggingService
        jest.mock('../services/LoggingService', () => ({
            LoggingService: {
                getInstance: jest.fn().mockReturnValue({
                    info: jest.fn(),
                    error: jest.fn(),
                    debug: jest.fn(),
                    warn: jest.fn(),
                }),
            },
        }));
    });

    it('should register a component plugin', async () => {
        const pluginDescriptor: PluginDescriptor = {
            module: 'ButtonPluginModule',
            package: 'buttons',
            class: 'ButtonPlugin',
            plugin: '@composaic/buttons',
            version: '1.0',
            description: 'Button components',
            extensionPoints: [
                {
                    id: 'component',
                    type: 'PluggableComponentProvider',
                },
            ],
        };

        await pluginManager.addPlugin(pluginDescriptor);

        const plugin = await pluginManager.getPlugin('@composaic/buttons');
        expect(plugin).toBeDefined();
        expect(plugin!.getPluginDescriptor().extensionPoints![0].id).toBe(
            'component'
        );
    });
});
```

### 2. Component Resolution Tests

```typescript
describe('Component Resolution', () => {
    beforeEach(() => {
        // Initialize plugins in correct order
        await pluginManager.addPlugin(registryPluginDescriptor);
        await pluginManager.addPlugin(buttonPluginDescriptor);
    });

    it('should resolve registered components', async () => {
        const registryPlugin = (await pluginManager.getPlugin(
            '@composaic/pluggable-components'
        )) as PluggableComponentsPlugin;

        const buttonDef = registryPlugin.getComponent('fancy-button');
        expect(buttonDef).toBeDefined();
        expect(buttonDef!.plugin).toBe('@composaic/buttons');
        expect(buttonDef!.component).toBe('FancyButton');
    });

    it('should validate props correctly', async () => {
        const registryPlugin = (await pluginManager.getPlugin(
            '@composaic/pluggable-components'
        )) as PluggableComponentsPlugin;

        const result = registryPlugin.validateProps('fancy-button', {
            label: 'Click Me',
            onClick: () => {},
            variant: 'primary',
        });

        expect(result.success).toBe(true);
    });
});
```

### 3. Out-of-Order Loading Tests

```typescript
describe('Out-of-Order Loading', () => {
    it('should handle extension registration before plugin loads', async () => {
        // Add button plugin first (provides extension)
        await pluginManager.addPlugin(buttonPluginDescriptor);

        // Then add registry plugin (provides extension point)
        await pluginManager.addPlugin(registryPluginDescriptor);

        const registry = (await pluginManager.getPlugin(
            '@composaic/pluggable-components'
        )) as PluggableComponentsPlugin;

        expect(registry.getComponent('fancy-button')).toBeDefined();
    });
});
```

### 4. Plugin Change Notification Tests

```typescript
describe('Plugin Change Notifications', () => {
    it('should notify listeners when components change', async () => {
        const callback = jest.fn();
        const unsubscribe = pluginManager.registerPluginChangeListener(
            ['@composaic/pluggable-components'],
            callback
        );

        await pluginManager.addPlugin(buttonPluginDescriptor);

        expect(callback).toHaveBeenCalledWith(
            '@composaic/pluggable-components'
        );

        unsubscribe();
    });
});
```

### 5. Component Rendering Tests

```typescript
describe('RegistryComponent', () => {
    // Mock PluginManager and necessary plugins
    beforeEach(() => {
        jest.mock('@composaic/core', () => ({
            PluginManager: {
                getInstance: () => ({
                    getPlugin: jest.fn().mockImplementation((id) => {
                        if (id === '@composaic/component-registry') {
                            return registryPluginMock;
                        }
                        if (id === '@composaic/buttons') {
                            return buttonPluginMock;
                        }
                    })
                })
            }
        }));
    });

    it('should render resolved components', async () => {
        const { getByText } = render(
            <RegistryComponent
                id="fancy-button"
                componentProps={{
                    label: "Test Button",
                    onClick: jest.fn(),
                    variant: "primary"
                }}
            />
        );

        await waitFor(() => {
            expect(getByText("Test Button")).toBeInTheDocument();
        });
    });

    it('should show validation errors', async () => {
        const { getByText } = render(
            <RegistryComponent
                id="fancy-button"
                componentProps={{
                    onClick: jest.fn()  // Missing required label
                }}
            />
        );

        await waitFor(() => {
            expect(getByText(/Label is required/)).toBeInTheDocument();
        });
    });

    it('should handle plugin changes', async () => {
        const { getByText, rerender } = render(
            <RegistryComponent id="fancy-button" />
        );

        // Simulate plugin change
        act(() => {
            pluginManagerMock.notifyPluginChanged('@composaic/component-registry');
        });

        await waitFor(() => {
            expect(getByText("Loading component...")).toBeInTheDocument();
        });
    });
});
```

The testing strategy follows the project's patterns for:

1. Plugin lifecycle testing
2. Extension point verification
3. Async component loading
4. Error handling
5. Event notifications

Each test suite focuses on a specific aspect of the system while maintaining isolation through proper mocking and cleanup.

import { Plugin } from '../mock-plugin.js';
import { PluginMetadata, ExtensionMetadata } from '../../../decorators.js';

export interface NavbarItem {
    id: string;
    label: string;
    mountAt: string;
    children: {
        label: string;
        path: string;
        component: string;
    }[];
}

@PluginMetadata({
    plugin: '@composaic-tests/navbar',
    version: '1.0',
    description: 'Extension for the @composaic/navbar plugin',
    load: 'deferred',
    package: 'navbar',
    module: 'NavbarExtension'
})
@ExtensionMetadata({
    plugin: '@composaic/navbar',
    id: 'navbarItem',
    className: 'NavbarItemExtension',
    meta: [{
        id: 'test.RemoteExamples',
        label: 'Remote Examples',
        mountAt: 'root.Profile',
        children: [{
            label: 'Remote Example',
            path: '/remoteexample',
            component: 'RemoteExamplePage'
        }]
    }]
})
export class NavbarExtensionPlugin extends Plugin {
    async start() {
        // Plugin initialization
    }
}

export class NavbarItemExtension {
    getNavbarItems(): NavbarItem[] {
        return [];
    }
}

import { Plugin } from '../mock-plugin.js';
import { PluginMetadata, ExtensionMetadata } from '../../../decorators';

interface MenuItem {
    text: string;
    url: string;
}

@PluginMetadata({
    plugin: '@composaic/navbar',
    version: '0.1.0',
    description: 'Navbar Plugin',
    module: 'index',
    package: 'navbar',
    extensionPoints: [{
        id: 'navbar',
        type: 'NavbarExtensionPoint'
    }]
})
export class NavbarPlugin {
    items: MenuItem[] = [];

    addItem(item: MenuItem): void {
        this.items.push(item);
    }
}

@ExtensionMetadata({
    plugin: 'self',
    id: 'navbar',
    className: 'CustomMenuItem'
})
export class CustomMenuItem implements MenuItem {
    constructor(
        public text: string,
        public url: string
    ) {}
}

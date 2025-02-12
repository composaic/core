import { Plugin } from '../mock-plugin.js';
import { PluginMetadata, ExtensionMetadata } from '../../../decorators';

interface MenuItem {
    text: string;
    url: string;
}

@PluginMetadata({
    name: 'NavbarExtension',
    version: '1.0.0',
    description: 'A navbar extension plugin',
    extensionPoints: [{
        id: 'navbar',
        type: 'NavbarExtensionPoint'
    }]
})
export class NavbarExtension {
    items: MenuItem[] = [];

    addItem(item: MenuItem): void {
        this.items.push(item);
    }
}

@ExtensionMetadata({
    extensionPoint: {
        id: 'navbar',
        type: 'NavbarExtensionPoint'
    },
    implementation: 'CustomMenuItem'
})
export class CustomMenuItem implements MenuItem {
    constructor(
        public text: string,
        public url: string
    ) {}
}

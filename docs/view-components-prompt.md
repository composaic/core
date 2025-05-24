1. You will create your design document in a separate file in this folder, called view-components-design.md
2. Existing files you need to look at
   2.1 Views plugin definition: /Users/johnny/dev/composaic/web/src/plugins/views/index.ts
   2.2 The component defined for 'master' slot in the view plugin extension: /Users/johnny/dev/composaic/web/src/plugins/views/SampleViewComponent.tsx
   2.3 The plugin extending views plugin and providing a component for the 'detail' slot: /Users/johnny/dev/composaic/demo/applications/plugin-template/src/plugins/views/2.4 ViewsExtension.ts
   2.5 The component for the 'detail' slot: /Users/johnny/dev/composaic/demo/applications/plugin-template/src/plugins/views/PluginTestComponent.tsx
   2.6 The components implementing the extension point: /Users/johnny/dev/composaic/web/src/plugins/views/components
   2.7 The example page where this configuration is being used: /Users/johnny/dev/composaic/web/src/plugins/navbar/Example1Page.tsx
   2.7 For extension points + extensions study the following files:
   /Users/johnny/dev/composaic/core/src/plugins/PluginManager.ts
   /Users/johnny/dev/composaic/core/src/plugin-system (all files)
   2.8 To test your implementation run /Users/johnny/dev/composaic/core/scripts/dev-build -b
3. Always carry out the task marked [next]
4. Always stop when you see [stop]
   [next]
5. Keeping the existing views implementation intact, first come up with a design that just conflates ViewComponent and ViewContainer into a single class
   [stop]

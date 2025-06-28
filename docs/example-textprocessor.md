1. I want to start building examples with composaic - for this create a new top level project, 'examples' (/Users/johnny/dev/composaic/examples)
2. In this project there will be separate applications in their own folders
3. First application is textprocessor
4. Using the composaic plugin framework (@composaic/core) introduce TextProcessor plugin with a single extension TextProcessorExtension
5. When I say use the plugin framework, you will use the decorators to describe plugins, extensions, extension points
6. You will use the plugin registering mechanism (study demo/src/core/App.tsx for how init() is used)
7. Also study web/src/plugin-util.ts for how local plugins are described
8. Inside the new example create src/plugins with all the required plugins (TextProcessor and the various extensions like UpperCaseTextProcessor etc)
9. Using the technique in web describe the plugin module and then in the example app use this descriptor function (equivalent to getPluginModule) to introduce the plugins to @composaic/core framework
10. To use the plugins you will use the PluginManager:getPlugin() to get the TextProcessorPlugin, then you will get the connected extensions to get all the processors
11. For the UI: left hand side have a text area, middle have a column of buttons with the various processor actions (uppercase, etc.) - Button labels can be exposed by the plugin extensions as a method or something, on the right hand side have an output
12. You can provide 2 modes for operation: 1) basic when buttons are push buttons and they execute the transformation, result shown on right hand side, job done
13. Combined mode, where buttons behave as toggle buttons, and all the enabled (toggled) processors will be applied to the text (for a bonus: in the order how buttons were pressed down)

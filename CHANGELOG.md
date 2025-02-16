# Changelog

## 0.13.4 (16 Feb 2025)

o Manifest based plugin metadata introduced

## 0.13.0 (26 Jan 2025)

o Extracted web application plugins to @composaic/web
o Implemented new interface to access plugins in PluginModule

## 0.12.1 (3 Jan 2025)

o Removed React related stuff from dependencies

## 0.12.0 (22 Dec 2024)

o Moved project to composaic org, renaming to @composaic/core

## 0.11.0 (11 Dec 2024)

o Reactive + progressive refactor done

## 0.10.5 (5 Nov 2024)

o Fix for the incorrect use of Promise.all (change to Promise.allSettled) causing a premature application initialisation
(first failed remote manifest fetch aborted loading rest of the manifests)

## 0.10.4 (20 Oct 2024)

o no change (npm i was not picking up on 0.10.3 but it was a caching/time issue)

## 0.10.2-3 (13 Oct 2024)

o expose ConfigurationService.getEnv() to return environment string.

## 0.10.1 (13 Oct 2024)

o expose ConfigurationService

## 0.10.0 (13 Oct 2024)

o moving to @module-federation/enhanced requires some slight refactoring around the remote attributes

## 0.9.1 (13 Oct 2024)

o Added more details to ErrorBoundary component

## 0.9.0 (12 Oct 2024)

o Discarding the idea of using SystemJS

## 0.8.1 (03 Oct 2024)

o Introduced loader property in PluginDescriptor to allow loading plugins from
various sources
o Refactor has been done in previous versions which were partly undone, this was all
due to remote federation issues around using composaic as a node module

## 0.4.26 (10 Sep 2024)

o Making SignalService use the new GlobalScopeService

## 0.4.25 (10 Sep 2024)

o Added GlobalScopeService (vite no longer supports singletons, so we'll need to introduce Window scoped variables for this)

## 0.1.4 (28 May 2024) - Tag test 3

o Uhm ... the version in package.json is not automatically bumped :D

## 0.1.3 (28 May 2024) - Tag test 2

o Installed the NPM_TOKEN as GitHub repository secret

## 0.1.3 (28 May 2024) - Tag test 2

o Installed the NPM_TOKEN as GitHub repository secret

## 0.1.2 (28 May 2024) - Tag test

o Trying github pipeline for autopublish based on tags (failed)

## 0.1.1 (28 May 2024) - First Release

0 Initial version with test function.

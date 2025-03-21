# TARS Automation System

## Overview

The TARS Automation System is a customized automation framework designed to streamline development workflows in the Composaic project. It uses TARSX, a declarative scripting language, to define and execute complex automation tasks.

## Directory Structure

- `tarsx-lang/` - Language specification and documentation

    - `syntax.md` - Core syntax definition
    - `examples.md` - Example scripts and usage patterns
    - `extensions/` - Language extensions and future features
    - `versions.md` - Version compatibility matrix

- `scripts/` - TARSX automation scripts
    - Contains `.tx` files that define various automation workflows
    - Each script is documented with its purpose and requirements

## Version Control

The TARSX language follows semantic versioning:

- Major version changes may introduce breaking changes
- Minor version changes add new features while maintaining backward compatibility
- Patch version changes include bug fixes and clarifications

Each script declares its required TARSX version, ensuring compatibility and proper execution.

## Usage

TARSX scripts use the `.tx` extension and follow this basic structure:

```tarsx
VERSION 0.1

# Script metadata
NAME "Script Name"
DESCRIPTION "What this script does"

# Main logic
STEP "Step Name" {
  EXPECT "Expected outcome"
  RUN "command"
}
```

Scripts can be executed through TARS, which will validate the syntax, check version compatibility, and execute the defined steps.

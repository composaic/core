# Dependency Upgrade Script

## Overview

The `upgrade-deps.tx` script automates the process of upgrading dependencies across the Composaic project's repositories:

- core
- web
- demo

## Script Location

`.tars/scripts/upgrade-deps.tx`

## Requirements

- npm-check-updates (ncu) installed globally or available via npx
- Node.js and npm installed
- Access to all Composaic repositories

## Process Flow

1. Core Project

    - Verify project exists
    - Upgrade dependencies
    - Run tests
    - Build project

2. Web Project

    - Verify project exists
    - Upgrade dependencies
    - Build project

3. Demo Project

    - Verify project exists
    - Upgrade dependencies
    - Build project

4. Verification
    - Check all builds succeeded
    - Optional: Start applications for testing

## Error Handling

The script includes error handling for common scenarios:

- Missing repositories
- Failed dependency upgrades
- Failed builds
- Failed tests

## User Interactions

The script may prompt for user input at certain points:

- Confirmation before major changes
- Option to start applications after upgrade
- Handling of conflicting dependencies

## Example Usage

Basic execution:

```bash
tars run upgrade-deps
```

## Customization

The script can be modified to:

- Change project locations
- Add additional verification steps
- Modify the build process
- Add deployment steps

## Troubleshooting

Common issues and solutions:

1. **Missing Repository**

    - Ensure all repositories are cloned
    - Verify correct paths in script

2. **Dependency Conflicts**

    - Review package.json changes
    - Check compatibility matrix

3. **Build Failures**
    - Check logs for errors
    - Verify project configuration

#!/usr/bin/env node

/**
 * Instructions for AI
 * 1. look at the check-deps-upgrade.js file for
 *   - use of commander library for command line arguments
 *   - use of path to execute commands
 * 2. required command line arguments
 *  -h --help display bried description and list the options with explanation (pretty print)
 *  -d --dry-run dry run the script without executing any commands
 *  -b --build-and-run build the projects and run servers
 * If no option specified default to -h explaining that to run the script you either need to specify -d or -b
 * 2. Steps
 *   - if -b --build-and-run is specified
 *      - [core]: npm i, npm run build
 *      - [web]: npm i, npm run build
 *      - [test-plugin-one]: npm i, npm run build
 *      - [plugin-template]: npm i, npm run build
 *      - [demo]: npm i, npm run build
 *   - end-if
 *   - npm run serve in [demo], [test-plugin-one], [plugin-template] (start all servers in parallel)
 */

const { program } = require('commander');
const { execSync, spawn } = require('child_process');
const path = require('path');

// Get composaic root directory (parent of core)
const COMPOSAIC_ROOT = path.dirname(process.cwd());

// Helper function to get absolute path for a project
function getProjectPath(projectPath) {
    return path.resolve(COMPOSAIC_ROOT, projectPath);
}

// Project paths
const PROJECTS = {
    core: 'core',
    web: 'web',
    'test-plugin-one': 'demo/applications/test-plugin-one',
    'plugin-template': 'demo/applications/plugin-template',
    demo: 'demo',
};

// Dependency relationships for linked mode
const LINK_ORDER = {
    core: [],
    web: ['core'],
    'test-plugin-one': ['core', 'web'],
    'plugin-template': ['core', 'web'],
    demo: ['core', 'web'],
};

// Package names for unlinking
const PACKAGE_NAMES = {
    core: '@composaic/core',
    web: '@composaic/web',
};

function execCommand(
    command,
    projectPath,
    dryRun = false,
    useAbsolutePath = false
) {
    const targetDir = useAbsolutePath
        ? projectPath
        : getProjectPath(projectPath);
    console.log(`\n🔧 Executing: ${command} in ${targetDir}`);

    if (dryRun) {
        console.log(`Would execute: ${command} in ${targetDir}`);
        return;
    }

    try {
        execSync(command, {
            cwd: targetDir,
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, PATH: process.env.PATH },
        });
    } catch (error) {
        if (error.status === 1 && command.startsWith('npm ls')) {
            // Ignore npm ls errors as they're just informational
            return;
        }
        console.error(
            `\n❌ Error executing command: ${command} in ${targetDir}`
        );
        console.error(error);
        process.exit(1);
    }
}

function buildProject(project, dryRun) {
    console.log(`\n🔨 Building ${project}...`);
    execCommand('npm i', PROJECTS[project], dryRun);
    execCommand('npm run build', PROJECTS[project], dryRun);
}

function spawnServer(project, dryRun) {
    return new Promise((resolve, reject) => {
        const targetDir = getProjectPath(PROJECTS[project]);
        console.log(`\n🚀 Starting server for ${project}...`);
        console.log(`\n🔧 Executing: npm run serve in ${targetDir}`);

        if (dryRun) {
            console.log(`Would execute: npm run serve in ${targetDir}`);
            resolve();
            return;
        }

        const child = spawn('npm', ['run', 'serve'], {
            cwd: targetDir,
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, PATH: process.env.PATH },
        });

        child.on('error', (error) => {
            console.error(`\n❌ Error starting server for ${project}:`, error);
            reject(error);
        });

        // Don't resolve the promise as we want to keep the servers running
        child.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                console.error(
                    `\n❌ Server for ${project} exited with code ${code}`
                );
                reject(new Error(`Server ${project} failed with code ${code}`));
            }
        });

        // Resolve after a short delay to allow for startup
        setTimeout(() => resolve(child), 1000);
    });
}

function unlinkDependencies(project, dryRun) {
    console.log(`\n🔓 Unlinking dependencies for ${project}...`);
    const dependencies = LINK_ORDER[project] || [];

    dependencies.forEach((dep) => {
        const packageName = PACKAGE_NAMES[dep];
        if (packageName) {
            try {
                execCommand(
                    `npm unlink ${packageName}`,
                    PROJECTS[project],
                    dryRun
                );
            } catch (error) {
                // Ignore unlink errors as the package might not be linked
                console.log(
                    `Note: ${packageName} was not linked in ${project}`
                );
            }
        }
    });
}

function unlinkAllProjects(dryRun) {
    console.log('\n🔓 Unlinking all projects...');
    // Unlink in reverse dependency order
    ['demo', 'test-plugin-one', 'plugin-template', 'web', 'core'].forEach(
        (project) => {
            unlinkDependencies(project, dryRun);
            // Also remove the project's own link if it's a dependency
            if (PACKAGE_NAMES[project]) {
                try {
                    execCommand('npm unlink', PROJECTS[project], dryRun);
                } catch (error) {
                    // Ignore unlink errors
                    console.log(`Note: ${project} was not linked globally`);
                }
            }
        }
    );
}

function linkDependencies(project, dryRun) {
    console.log(`\n🔗 Linking dependencies for ${project}...`);
    const dependencies = LINK_ORDER[project] || [];

    dependencies.forEach((dep) => {
        const packageName = PACKAGE_NAMES[dep];
        if (!packageName) {
            console.error(`\n❌ No package name defined for ${dep}`);
            return;
        }

        console.log(`\n🔗 Linking ${packageName} in ${project}...`);
        execCommand(`npm link ${packageName}`, PROJECTS[project], dryRun);
    });
}

async function buildProjectWithLinks(project, dryRun) {
    console.log(`\n🔨 Building ${project} with links...`);

    // First run npm install
    execCommand('npm install', PROJECTS[project], dryRun);

    // Create a global link for this package if it's a dependency
    if (Object.values(LINK_ORDER).some((deps) => deps.includes(project))) {
        console.log(`\n🔗 Creating global link for ${project}...`);
        execCommand('npm link', PROJECTS[project], dryRun);
    }

    // Then link its dependencies
    linkDependencies(project, dryRun);

    // Finally build with linked dependencies
    execCommand('npm run build', PROJECTS[project], dryRun);
}

async function buildAllProjects(dryRun = false, linkedMode = false) {
    console.log(
        `\n📦 Building all projects${linkedMode ? ' in linked mode' : ''}...`
    );

    if (linkedMode) {
        // Build in dependency order
        await buildProjectWithLinks('core', dryRun);
        await buildProjectWithLinks('web', dryRun);
        await buildProjectWithLinks('test-plugin-one', dryRun);
        await buildProjectWithLinks('plugin-template', dryRun);
        await buildProjectWithLinks('demo', dryRun);
    } else {
        // Unlink everything first
        unlinkAllProjects(dryRun);
        // Regular build order
        buildProject('core', dryRun);
        buildProject('web', dryRun);
        buildProject('test-plugin-one', dryRun);
        buildProject('plugin-template', dryRun);
        buildProject('demo', dryRun);
    }
}

async function runAllServers(dryRun = false) {
    console.log('\n🖥️  Starting all servers in parallel...');
    const servers = ['demo', 'test-plugin-one', 'plugin-template'];

    try {
        await Promise.all(
            servers.map((project) => spawnServer(project, dryRun))
        );
        console.log('\n✅ All servers started successfully');
    } catch (error) {
        console.error('\n❌ Failed to start servers:', error);
        process.exit(1);
    }
}

async function execute(options) {
    const { dryRun, buildAndRun, runServers, linkedMode } = options;

    if (dryRun) {
        console.log(
            '\n📋 DRY RUN - Commands will be logged but not executed\n'
        );
    }

    if (!buildAndRun && !runServers) {
        console.log(
            '❌ Error: Must specify either --build-and-run (-b) or --run-servers (-r)'
        );
        program.help();
        return;
    }

    if (buildAndRun) {
        await buildAllProjects(dryRun, linkedMode);
        await runAllServers(dryRun);
    } else if (runServers) {
        // Even in server-only mode, unlink if not using linked mode
        if (!linkedMode) {
            unlinkAllProjects(dryRun);
        }
        await runAllServers(dryRun);
    }

    if (dryRun) {
        console.log('\n📋 End of Dry Run - No commands were executed');
    } else {
        console.log('\n🎉 All operations completed successfully');
        if (linkedMode) {
            console.log('\n🔗 Projects are using linked dependencies');
        }
        console.log('Press Ctrl+C to stop all servers');
    }
}

const description = `
Production Build Script
----------------------
This script manages the build process and server execution for the Composaic project.
It can build all projects and start their servers, or just start the servers without building.

You must specify one of these options:
- Build and run (-b): Builds all projects and starts their servers
- Run servers only (-r): Starts servers without building
- Dry run (-d): Shows what commands would be executed without actually running them

Additional options:
- Linked mode (-l): Uses npm link for local dependencies between projects
                   When not used, ensures all existing links are removed
                   Dependencies: core -> web -> (test-plugin-one, plugin-template, demo)

Note: When using --dry-run (-d), you must also specify either --build-and-run (-b) or --run-servers (-r)
`;

program
    .name('prod-build')
    .description(description)
    .option('-d, --dry-run', 'Show execution plan without making any changes')
    .option('-b, --build-and-run', 'Build all projects and run servers')
    .option('-r, --run-servers', 'Run servers without building')
    .option('-l, --linked-mode', 'Use npm link for local dependencies');

program.action((options) => {
    const { dryRun, buildAndRun, runServers, linkedMode } = options;

    // Only one main action should be specified
    if (buildAndRun && runServers) {
        console.log(
            '\n❌ Error: Cannot specify both --build-and-run and --run-servers'
        );
        program.help();
    }

    if (linkedMode) {
        console.log(
            '\n🔗 Running in linked mode - will use npm link for dependencies'
        );
    } else {
        console.log(
            '\n📦 Running in standard mode - will remove any existing links'
        );
    }

    execute(options).catch((error) => {
        console.error('\n❌ Operation failed:', error);
        process.exit(1);
    });
});

program.parse();

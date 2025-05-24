#!/usr/bin/env node

/**
 * Instructions for AI
 * 1. look at the check-deps-upgrade.js file for
 *   - use of commander library for command line arguments
 *   - use of path to execute commands
 * 2. required command line arguments
 *  -h --help display bried description and list the options with explanation (pretty print)
 *  -d --dry-run dry run the script without executing any commands
 *  -b --build build the projects
 *  -r --run-servers run the servers
 * If no option specified default to -h explaining that to run the script you either need to specify -d or -b
 * 2. Steps
 *   - if -b --build is specified
 *      - [core]: npm i, npm run build, then npm link
 *      - [web]: npm i, npm link @composaic/core, then npm run build, finally npm link
 *      - [test-plugin-one]: npm i, npm link @composaic/core, @composaic/web
 *      - [plugin-template]: npm i, npm link @composaic/core, @composaic/web
 *      - [demo]: npm i, npm link @composaic/core, @composaic/web
 *   - end-if
 *   - if -r
 *      - npm run start in [demo], [test-plugin-one], [plugin-template] (start all servers in parallel)
 *   - else
 *      - npm run build in [demo], [test-plugin-one], [plugin-template] (you can run these 3 commands sequentially)
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

// Project paths and dependencies
const PROJECTS = {
    core: {
        path: 'core',
        needsLink: true,
        buildCommand: 'build',
    },
    web: {
        path: 'web',
        dependencies: ['@composaic/core'],
        needsLink: true,
        buildCommand: 'build',
    },
    'test-plugin-one': {
        path: 'demo/applications/test-plugin-one',
        dependencies: ['@composaic/core', '@composaic/web'],
        buildCommand: 'build', // Added buildCommand
    },
    'plugin-template': {
        path: 'demo/applications/plugin-template',
        dependencies: ['@composaic/core', '@composaic/web'],
        buildCommand: 'build', // Added buildCommand
    },
    demo: {
        path: 'demo',
        dependencies: ['@composaic/core', '@composaic/web'],
        buildCommand: 'build', // Added buildCommand
    },
};

function execCommand(command, projectPath, dryRun = false) {
    const targetDir = getProjectPath(projectPath);
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
        console.error(
            `\n❌ Error executing command: ${command} in ${targetDir}`
        );
        console.error(error);
        process.exit(1);
    }
}

function buildProject(project, dryRun) {
    const config = PROJECTS[project];
    console.log(`\n🔨 Setting up ${project}...`);

    // Install dependencies
    execCommand('npm i', config.path, dryRun);

    // Link dependencies if any
    if (config.dependencies) {
        console.log(`\n🔗 Linking dependencies for ${project}...`);
        config.dependencies.forEach((dep) => {
            execCommand(`npm link ${dep}`, config.path, dryRun);
        });
    }

    // Build if needed
    if (config.buildCommand) {
        console.log(`\n🏗️  Building ${project}...`);
        execCommand(`npm run ${config.buildCommand}`, config.path, dryRun);
    }

    // Make available for linking if needed
    if (config.needsLink) {
        console.log(`\n📦 Making ${project} available for linking...`);
        execCommand('npm link', config.path, dryRun);
    }
}

function runProjectCommand(project, command, dryRun, isServer = true) {
    return new Promise((resolve, reject) => {
        const targetDir = getProjectPath(PROJECTS[project].path);
        console.log(
            `\n${isServer ? '🚀 Starting development server' : '🏗️  Building webpack bundle'} for ${project}...`
        );
        console.log(`\n🔧 Executing: npm run ${command} in ${targetDir}`);

        if (dryRun) {
            console.log(`Would execute: npm run ${command} in ${targetDir}`);
            resolve();
            return;
        }

        const child = spawn('npm', ['run', command], {
            cwd: targetDir,
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, PATH: process.env.PATH },
        });

        child.on('error', (error) => {
            console.error(
                `\n❌ Error ${isServer ? 'starting server' : 'building'} for ${project}:`,
                error
            );
            reject(error);
        });

        child.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                console.error(
                    `\n❌ ${isServer ? 'Server' : 'Build'} for ${project} exited with code ${code}`
                );
                reject(
                    new Error(
                        `${isServer ? 'Server' : 'Build'} ${project} failed with code ${code}`
                    )
                );
            } else {
                if (!isServer) {
                    resolve(); // For builds, resolve immediately
                } else {
                    // For servers, resolve after a delay to allow startup
                    setTimeout(() => resolve(child), 1000);
                }
            }
        });
    });
}

async function buildFramework(dryRun = false) {
    // Build and link core first
    console.log('\n📦 Building core project...');
    buildProject('core', dryRun);

    // Build and link web next
    console.log('\n📦 Building web project...');
    buildProject('web', dryRun);

    // Build demo projects with proper linking
    console.log('\n📦 Building demo projects...');
    buildProject('test-plugin-one', dryRun);
    buildProject('plugin-template', dryRun);
    buildProject('demo', dryRun);
}

async function buildOrStartServers(dryRun = false, isServer = false) {
    const projects = ['demo', 'test-plugin-one', 'plugin-template'];

    if (isServer) {
        // Start all servers in parallel
        console.log('\n🚀 Starting development servers...');
        try {
            await Promise.all(
                projects.map((project) =>
                    runProjectCommand(project, 'start', dryRun, true)
                )
            );
            console.log('\n✅ All development servers started successfully');
        } catch (error) {
            console.error('\n❌ Failed to start servers:', error);
            process.exit(1);
        }
    } else {
        // Run webpack builds sequentially
        console.log('\n🏗️  Building webpack bundles...');
        try {
            for (const project of projects) {
                await runProjectCommand(project, 'build', dryRun, false);
            }
            console.log('\n✅ All webpack builds completed successfully');
        } catch (error) {
            console.error('\n❌ Failed to build:', error);
            process.exit(1);
        }
    }
}

async function execute(options) {
    const { dryRun, build, runServers } = options;

    if (dryRun) {
        console.log(
            '\n📋 DRY RUN - Commands will be logged but not executed\n'
        );
    }

    if (!build && !runServers) {
        console.log(
            '❌ Error: Must specify either --build (-b) or --run-servers (-r)'
        );
        program.help();
        return;
    }

    if (build) {
        await buildFramework(dryRun);
    }

    if (runServers) {
        // Start servers in parallel
        await buildOrStartServers(dryRun, true);
    } else if (!build) {
        // Run webpack builds sequentially
        await buildOrStartServers(dryRun, false);
    }

    if (dryRun) {
        console.log('\n📋 End of Dry Run - No commands were executed');
    } else {
        console.log('\n🎉 All operations completed successfully');
        if (runServers) {
            console.log('Press Ctrl+C to stop all development servers');
        }
    }
}

const description = `
Development Build Script
-----------------------
This script manages the build process and development server execution for the Composaic project.
It handles npm linking between packages and project builds.

Required command line arguments:
  -h, --help         Display this help message
  -d, --dry-run      Dry run the script without executing any commands
  -b, --build        Build the projects (npm install, link and build)
  -r, --run-servers  Run the development servers

If -r is specified:
  - Starts development servers in parallel for demo, test-plugin-one, and plugin-template
If -r is not specified:
  - Runs webpack builds sequentially for demo, test-plugin-one, and plugin-template

Note: When using --dry-run (-d), you must also specify either --build (-b) or --run-servers (-r)
`;

program
    .name('dev-build')
    .description(description)
    .option('-d, --dry-run', 'Show execution plan without making any changes')
    .option('-b, --build', 'Build all projects with proper linking')
    .option('-r, --run-servers', 'Run development servers');

program.action((options) => {
    execute(options).catch((error) => {
        console.error('\n❌ Operation failed:', error);
        process.exit(1);
    });
});
program.parse();

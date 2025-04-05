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
 *      - [core]: npm i, npm run build, then npm link
 *      - [web]: npm i, npm link @composaic/core, then npm run build, finally npm link
 *      - [test-plugin-one]: npm i, npm link @composaic/core, @composaic/web
 *      - [plugin-template]: npm i, npm link @composaic/core, @composaic/web
 *      - [demo]: npm i, npm link @composaic/core, @composaic/web
 *   - end-if
 *   - npm start in [demo], [test-plugin-one], [plugin-template] (start all servers in parallel)
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
    },
    'plugin-template': {
        path: 'demo/applications/plugin-template',
        dependencies: ['@composaic/core', '@composaic/web'],
    },
    demo: {
        path: 'demo',
        dependencies: ['@composaic/core', '@composaic/web'],
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

function spawnServer(project, dryRun) {
    return new Promise((resolve, reject) => {
        const targetDir = getProjectPath(PROJECTS[project].path);
        console.log(`\n🚀 Starting development server for ${project}...`);
        console.log(`\n🔧 Executing: npm start in ${targetDir}`);

        if (dryRun) {
            console.log(`Would execute: npm start in ${targetDir}`);
            resolve();
            return;
        }

        const child = spawn('npm', ['start'], {
            cwd: targetDir,
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, PATH: process.env.PATH },
        });

        child.on('error', (error) => {
            console.error(`\n❌ Error starting server for ${project}:`, error);
            reject(error);
        });

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

async function buildAllProjects(dryRun = false) {
    // Build in specific order due to dependencies
    console.log('\n📦 Building all projects in order...');
    buildProject('core', dryRun);
    buildProject('web', dryRun);
    buildProject('test-plugin-one', dryRun);
    buildProject('plugin-template', dryRun);
    buildProject('demo', dryRun);
}

async function runAllServers(dryRun = false) {
    console.log('\n🖥️  Starting all development servers in parallel...');
    const servers = ['demo', 'test-plugin-one', 'plugin-template'];

    try {
        await Promise.all(
            servers.map((project) => spawnServer(project, dryRun))
        );
        console.log('\n✅ All development servers started successfully');
    } catch (error) {
        console.error('\n❌ Failed to start servers:', error);
        process.exit(1);
    }
}

async function execute(options) {
    const { dryRun, buildAndRun, runServers } = options;

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
        await buildAllProjects(dryRun);
        await runAllServers(dryRun);
    } else if (runServers) {
        await runAllServers(dryRun);
    }

    if (dryRun) {
        console.log('\n📋 End of Dry Run - No commands were executed');
    } else {
        console.log('\n🎉 All operations completed successfully');
        console.log('Press Ctrl+C to stop all development servers');
    }
}

const description = `
Development Build Script
-----------------------
This script manages the build process and development server execution for the Composaic project.
It handles npm linking between packages and can build all projects and start their development servers,
or just start the servers without building.

You must specify one of these options:
- Build and run (-b): Builds all projects with proper linking and starts their development servers
- Run servers only (-r): Starts development servers without building
- Dry run (-d): Shows what commands would be executed without actually running them

Note: When using --dry-run (-d), you must also specify either --build-and-run (-b) or --run-servers (-r)
`;

program
    .name('dev-build')
    .description(description)
    .option('-d, --dry-run', 'Show execution plan without making any changes')
    .option(
        '-b, --build-and-run',
        'Build all projects and run development servers'
    )
    .option('-r, --run-servers', 'Run development servers without building');

program.action((options) => {
    const { dryRun, buildAndRun, runServers } = options;

    // Only one main action should be specified
    if (buildAndRun && runServers) {
        console.log(
            '\n❌ Error: Cannot specify both --build-and-run and --run-servers'
        );
        program.help();
    }

    execute(options).catch((error) => {
        console.error('\n❌ Operation failed:', error);
        process.exit(1);
    });
});

program.parse();

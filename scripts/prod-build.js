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
 *   - npm run serve in [demo], [test-plugin-one], [plugin-template]
 */

const { program } = require('commander');
const { execSync } = require('child_process');
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
    console.log(`\n🔨 Building ${project}...`);
    execCommand('npm i', PROJECTS[project], dryRun);
    execCommand('npm run build', PROJECTS[project], dryRun);
}

function runServer(project, dryRun) {
    console.log(`\n🚀 Starting server for ${project}...`);
    execCommand('npm run serve', PROJECTS[project], dryRun);
}

async function buildAllProjects(dryRun = false) {
    console.log('\n📦 Building all projects...');
    buildProject('core', dryRun);
    buildProject('web', dryRun);
    buildProject('test-plugin-one', dryRun);
    buildProject('plugin-template', dryRun);
    buildProject('demo', dryRun);
}

async function runAllServers(dryRun = false) {
    console.log('\n🖥️  Starting servers...');
    runServer('demo', dryRun);
    runServer('test-plugin-one', dryRun);
    runServer('plugin-template', dryRun);
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

Note: When using --dry-run (-d), you must also specify either --build-and-run (-b) or --run-servers (-r)
`;

program
    .name('prod-build')
    .description(description)
    .option('-d, --dry-run', 'Show execution plan without making any changes')
    .option('-b, --build-and-run', 'Build all projects and run servers')
    .option('-r, --run-servers', 'Run servers without building');

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

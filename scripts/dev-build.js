#!/usr/bin/env node

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
        buildCommand: 'build', // Core is a library, no dev/prod distinction needed
    },
    web: {
        path: 'web',
        dependencies: ['@composaic/core'],
        needsLink: true,
        buildCommand: {
            development: 'build:dev', // Web project has specific dev/prod builds
            production: 'build',
        },
    },
    'test-plugin-one': {
        path: 'demo/applications/test-plugin-one',
        dependencies: ['@composaic/core', '@composaic/web'],
        buildCommand: {
            development:
                'clean && build:manifests && npx webpack --progress --mode development',
            production: 'build', // Uses default production mode
        },
        serverCommand: 'start',
    },
    'plugin-template': {
        path: 'demo/applications/plugin-template',
        dependencies: ['@composaic/core', '@composaic/web'],
        buildCommand: {
            development:
                'clean && build:manifests && npx webpack --progress --mode development',
            production: 'build',
        },
        serverCommand: 'start',
    },
    demo: {
        path: 'demo',
        dependencies: ['@composaic/core', '@composaic/web'],
        buildCommand: {
            development:
                'clean && build:manifests && npx webpack --progress --mode development',
            production: 'build',
        },
        serverCommand: 'start',
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

function buildProject(project, mode, dryRun) {
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
        console.log(
            `\n🏗️  Building ${project}${project !== 'core' ? ` in ${mode} mode` : ''}...`
        );

        // Get the appropriate build command
        const cmd =
            typeof config.buildCommand === 'string'
                ? config.buildCommand
                : config.buildCommand[mode] || config.buildCommand.production;

        // For commands with multiple steps, split and handle each appropriately
        const buildCmd = cmd.includes('&&')
            ? cmd
                  .split('&&')
                  .map((part) => {
                      const trimmed = part.trim();
                      // Keep npx webpack commands as is, prefix others with npm run
                      return trimmed.startsWith('npx webpack') ||
                          trimmed.startsWith('webpack')
                          ? trimmed
                          : `npm run ${trimmed}`;
                  })
                  .join(' && ')
            : `npm run ${cmd}`;

        execCommand(buildCmd, config.path, dryRun);
    }

    // Make available for linking if needed
    if (config.needsLink) {
        console.log(`\n📦 Making ${project} available for linking...`);
        execCommand('npm link', config.path, dryRun);
    }
}

function rebuildManifests(dryRun = false, watchMode = false) {
    const mode = watchMode ? 'watch' : 'build';
    const command = watchMode ? 'dev:manifests' : 'build:manifests -- --force';

    console.log(
        `\n🔄 ${watchMode ? 'Starting manifest watchers' : 'Rebuilding manifests'} for application plugins...`
    );

    // Get application plugins (those with serverCommand)
    const applicationPlugins = Object.keys(PROJECTS).filter(
        (project) => PROJECTS[project].serverCommand
    );

    applicationPlugins.forEach((project) => {
        console.log(
            `\n📝 ${watchMode ? 'Starting manifest watcher' : 'Rebuilding manifest'} for ${project}...`
        );
        execCommand(`npm run ${command}`, PROJECTS[project].path, dryRun);
    });

    console.log(`\n✅ Manifest ${mode} completed`);
}

function initialManifestBuild(dryRun = false) {
    console.log('\n🏗️  Building initial manifests before starting watchers...');

    // Get application plugins (those with serverCommand)
    const applicationPlugins = Object.keys(PROJECTS).filter(
        (project) => PROJECTS[project].serverCommand
    );

    applicationPlugins.forEach((project) => {
        console.log(`\n📝 Building initial manifest for ${project}...`);
        execCommand('npm run build:manifests', PROJECTS[project].path, dryRun);
    });

    console.log('\n✅ Initial manifest build completed');
}

function startServer(project, dryRun) {
    return new Promise((resolve, reject) => {
        const config = PROJECTS[project];
        const targetDir = getProjectPath(config.path);

        if (!config.serverCommand) {
            console.log(
                `\n⚠️ Project ${project} does not have a server command`
            );
            resolve();
            return;
        }

        console.log(`\n🚀 Starting development server for ${project}...`);
        console.log(
            `\n🔧 Executing: npm run ${config.serverCommand} in ${targetDir}`
        );

        if (dryRun) {
            console.log(
                `Would execute: npm run ${config.serverCommand} in ${targetDir}`
            );
            resolve();
            return;
        }

        const child = spawn('npm', ['run', config.serverCommand], {
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
            } else {
                resolve();
            }
        });
    });
}

async function buildFramework(mode, dryRun = false) {
    // Build and link core first
    console.log('\n📦 Building core project...');
    buildProject('core', mode, dryRun);

    // Build and link web next
    console.log(`\n📦 Building web project in ${mode} mode...`);
    buildProject('web', mode, dryRun);

    // Build demo projects with proper linking
    console.log(`\n📦 Building demo projects in ${mode} mode...`);
    buildProject('test-plugin-one', mode, dryRun);
    buildProject('plugin-template', mode, dryRun);
    buildProject('demo', mode, dryRun);
}

async function startServers(dryRun = false) {
    const projects = ['demo', 'test-plugin-one', 'plugin-template'];

    console.log('\n🚀 Starting development servers...');

    // Build initial manifests before starting servers
    initialManifestBuild(dryRun);

    console.log(
        '📝 Note: Manifest watchers will be started automatically by each server'
    );

    try {
        await Promise.all(
            projects.map((project) => startServer(project, dryRun))
        );
        console.log('\n✅ All development servers started successfully');
    } catch (error) {
        console.error('\n❌ Failed to start servers:', error);
        process.exit(1);
    }
}

async function execute(options) {
    const { dryRun, build, runServers, mode } = options;

    if (dryRun) {
        console.log(
            '\n📋 DRY RUN - Commands will be logged but not executed\n'
        );
    }

    if (!build && !runServers) {
        console.log(
            '❌ Error: Must specify either --build (-b) or --run-servers (-r) or both'
        );
        program.help();
        return;
    }

    if (build) {
        console.log(`\n🔧 Building projects in ${mode} mode`);
        await buildFramework(mode, dryRun);

        // If only building (not running servers), do one-time manifest generation
        if (!runServers) {
            rebuildManifests(dryRun, false); // false = build mode (one-time)
        }
    }

    if (runServers) {
        // When running servers, always use watch mode for manifests
        // Never skip manifest setup when running servers - we always want watchers
        await startServers(dryRun, false); // false = don't skip manifest setup
        console.log('Press Ctrl+C to stop all development servers');
    }

    if (!runServers) {
        console.log('\n🎉 All build operations completed successfully');
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
  -r, --run-servers  Run the development servers (starts manifest watchers)
  -m, --mode <mode>  Specify build mode for web projects (development or production)
                     Core builds use standard library build regardless of mode

Examples:
  Build all projects in development mode:
    dev-build -b

  Build in production mode:
    dev-build -b -m production

  Start development servers (starts manifest watchers):
    dev-build -r

  Build and start servers (builds once, then starts watchers):
    dev-build -b -r

Note: When using --dry-run (-d), you must also specify either --build (-b) or --run-servers (-r) or both
Note: -b uses build:manifests (one-time), -r uses dev:manifests (watch mode), -b -r uses dev:manifests
`;

program
    .name('dev-build')
    .description(description)
    .option('-d, --dry-run', 'Show execution plan without making any changes')
    .option('-b, --build', 'Build all projects with proper linking')
    .option('-r, --run-servers', 'Run development servers')
    .option(
        '-m, --mode <mode>',
        'Specify build mode (development or production)',
        'development'
    );

program.action((options) => {
    execute(options).catch((error) => {
        console.error('\n❌ Operation failed:', error);
        process.exit(1);
    });
});

program.parse();

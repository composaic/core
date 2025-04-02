#!/usr/bin/env node

const { program } = require('commander');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get composaic root directory (parent of core)
const COMPOSAIC_ROOT = path.dirname(process.cwd());

// Helper function to get absolute path for a project
function getProjectPath(projectPath) {
    return path.resolve(COMPOSAIC_ROOT, projectPath);
}

// Project configuration
const PROJECTS = {
    core: {
        path: 'core',
        dependents: ['web', 'demo', 'plugin-template', 'test-plugin-one'],
    },
    web: {
        path: 'web',
        dependents: ['demo', 'plugin-template', 'test-plugin-one'],
    },
    demo: {
        path: 'demo',
    },
    'plugin-template': {
        path: 'demo/applications/plugin-template',
    },
    'test-plugin-one': {
        path: 'demo/applications/test-plugin-one',
    },
};

// Compute dependencies based on dependents
function getDependencies(project) {
    return Object.entries(PROJECTS)
        .filter(([_, config]) => config.dependents?.includes(project))
        .map(([name, _]) => name);
}

function execCommand(command, options = {}, dryRun = false, verbose = false) {
    const targetDir = options.cwd ? options.cwd : process.cwd();
    const originalDir = process.cwd();

    if (dryRun) {
        console.log(`Would execute: ${command} in ${targetDir}`);
        return;
    }

    if (verbose) {
        console.log(`\n📂 Working Directory: ${targetDir}`);
    }
    console.log(`\n🔧 Executing: ${command} in ${targetDir}`);

    try {
        // Change to target directory
        process.chdir(targetDir);

        // Execute command
        const result = execSync(command, {
            stdio: 'inherit',
            shell: true,
            ...options,
            env: { ...process.env, PATH: process.env.PATH },
        });

        // Return to original directory
        process.chdir(originalDir);

        return result;
    } catch (error) {
        console.error(
            `\n❌ Error executing command: ${command} in ${targetDir}`
        );
        console.error(error);
        console.error(
            '\n❌ Dependency upgrade check failed. Please fix the errors and try again.'
        );

        // Ensure we return to original directory even if command fails
        process.chdir(originalDir);
        process.exit(1);
    }
}

async function checkoutBranch(
    projectPath,
    branch,
    dryRun = false,
    verbose = false
) {
    const absPath = getProjectPath(projectPath);
    console.log(`\n🔄 Checking out branch ${branch} in ${absPath}`);
    execCommand('git fetch', { cwd: absPath }, dryRun, verbose);
    execCommand(`git checkout ${branch}`, { cwd: absPath }, dryRun, verbose);
}

async function buildProjectAndDeps(
    project,
    projectPath,
    dryRun = false,
    verbose = false
) {
    try {
        const absPath = getProjectPath(projectPath);
        console.log(`\n🔨 Building ${project} in ${absPath}`);

        // Install dependencies and run security fixes
        console.log(`\n📦 Installing dependencies...`);
        execCommand('npm install', { cwd: absPath }, dryRun, verbose);
        console.log(`\n🔒 Running security audit fixes...`);
        try {
            execCommand('npm audit fix', { cwd: absPath }, dryRun, verbose);
        } catch (error) {
            console.warn(
                '\n⚠️  Security audit fix failed, continuing anyway...'
            );
        }

        // Link any required dependencies
        const dependencies = getDependencies(project);
        if (dependencies.length > 0) {
            console.log(`\n🔗 Linking dependencies for ${project}`);
            for (const dep of dependencies) {
                console.log(`Linking ${dep}`);
                execCommand(
                    `npm link @composaic/${dep}`,
                    { cwd: absPath },
                    dryRun,
                    verbose
                );
            }
        }

        // Build
        console.log(`\n🏗️  Building ${project}...`);
        try {
            execCommand('npm run build', { cwd: absPath }, dryRun, verbose);
        } catch (error) {
            throw new Error(
                `Build failed for ${project}. Fix build errors before proceeding.`
            );
        }

        // Test
        console.log(`\n🧪 Running tests for ${project}...`);
        try {
            execCommand('npm test', { cwd: absPath }, dryRun, verbose);
        } catch (error) {
            throw new Error(
                `Tests failed for ${project}. Fix failing tests before proceeding.`
            );
        }

        // If this is a dependency (like core or web), make it available for linking
        if (PROJECTS[project].dependents) {
            console.log(`\n🔗 Making ${project} available for linking`);
            execCommand('npm link', { cwd: absPath }, dryRun, verbose);
        }

        console.log(`\n✅ ${project} processed successfully`);
    } catch (error) {
        console.error(`\n❌ Failed processing ${project}: ${error.message}`);
        process.exit(1);
    }
}

async function checkProject(project, branch, dryRun = false, verbose = false) {
    const projectConfig = PROJECTS[project];
    if (!projectConfig) {
        console.error(`Unknown project: ${project}`);
        process.exit(1);
    }

    if (dryRun) {
        console.log('\n📋 DRY RUN - Execution Plan:\n');
    }

    console.log(
        `\n📦 ${dryRun ? 'Would check' : 'Checking'} dependency upgrade for ${project}`
    );

    // 1. Checkout the upgrade branch in target project
    await checkoutBranch(projectConfig.path, branch, dryRun, verbose);

    // 2. Build and test target project
    await buildProjectAndDeps(project, projectConfig.path, dryRun, verbose);

    // 3. Check dependent projects
    if (projectConfig.dependents) {
        console.log(
            `\n🔍 ${dryRun ? 'Would check' : 'Checking'} dependent projects for ${project}:`
        );

        for (const dependent of projectConfig.dependents) {
            console.log(
                `\n📑 ${dryRun ? 'Would process' : 'Processing'} dependent project: ${dependent}`
            );
            const depConfig = PROJECTS[dependent];
            await buildProjectAndDeps(
                dependent,
                depConfig.path,
                dryRun,
                verbose
            );
        }
    }

    if (dryRun) {
        console.log('\n📋 End of Execution Plan - No changes were made');
    } else {
        console.log(
            '\n🎉 All dependency upgrade checks completed successfully!'
        );
        console.log(
            '👉 Review the changes and make sure everything works as expected.'
        );
        console.log('📝 If satisfied, commit the changes and push the branch.');
    }
}

program
    .name('check-deps-upgrade')
    .description('Check dependency upgrade impacts across projects')
    .requiredOption(
        '-p, --project <project>',
        'Project to check (core, web, demo, plugin-template, test-plugin-one)'
    )
    .requiredOption(
        '-b, --branch <branch>',
        'Branch name with dependency updates'
    )
    .option('-d, --dry-run', 'Show execution plan without making any changes')
    .option(
        '-v, --verbose',
        'Show additional information like working directory'
    )
    .action((options) => {
        checkProject(
            options.project,
            options.branch,
            options.dryRun,
            options.verbose
        );
    });

program.parse();

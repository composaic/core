#!/usr/bin/env node

/**
 * Upgrade Dependencies Script
 *
 * This script automates the process of:
 * 1. Creating new branches in all 3 projects (core, web, applications)
 * 2. Running ncu to upgrade package dependencies (excluding React 19)
 * 3. Building all projects to verify upgrades work
 *
 * Usage: node upgrade-deps.js <branch-name>
 * Example: node upgrade-deps.js feature/upgrade-deps-2024
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for better output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
    log(
        `\n${colors.bright}${colors.blue}[STEP ${step}]${colors.reset} ${colors.cyan}${message}${colors.reset}`
    );
}

function logSuccess(message) {
    log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
    log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
    log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function showHelp() {
    log(
        `
${colors.bright}${colors.magenta}🚀 Composaic Dependency Upgrade Script${colors.reset}

${colors.bright}USAGE:${colors.reset}
  node upgrade-deps.js <branch-name> [options]

${colors.bright}OPTIONS:${colors.reset}
  -d, --dry-run    Show what would be done without making any changes

${colors.bright}DESCRIPTION:${colors.reset}
  This script automates the dependency upgrade process across all Composaic projects:
  
  1. ${colors.cyan}Creates new branches${colors.reset} in core, web, and applications projects
  2. ${colors.cyan}Runs ncu (npm-check-updates)${colors.reset} to upgrade dependencies
     - Excludes React and React-DOM (staying on v18 for now)
     - Shows interactive upgrade options
  3. ${colors.cyan}Builds all projects${colors.reset} using dev-build.js to verify upgrades work

${colors.bright}EXAMPLES:${colors.reset}
  node upgrade-deps.js feature/upgrade-deps-2024
  node upgrade-deps.js chore/update-dependencies --dry-run
  node upgrade-deps.js deps/quarterly-update -d

${colors.bright}PREREQUISITES:${colors.reset}
  - npm-check-updates installed globally: ${colors.yellow}npm install -g npm-check-updates${colors.reset}
  - Clean git working directory in all projects
  - All projects should be on main/master branch

${colors.bright}PROJECTS AFFECTED:${colors.reset}
  - ${colors.cyan}core/${colors.reset} (main framework)
  - ${colors.cyan}web/${colors.reset} (web application)  
  - ${colors.cyan}applications/${colors.reset} (plugin applications)

${colors.bright}SAFETY FEATURES:${colors.reset}
  - Checks git status before making changes
  - Creates branches before any modifications
  - Excludes React 19 to maintain compatibility
  - Runs build verification after upgrades
`,
        ''
    );
}

function execCommand(command, cwd = process.cwd(), options = {}) {
    if (options.dryRun) {
        log(
            `${colors.cyan}[DRY RUN]${colors.reset} Would execute: ${colors.yellow}${command}${colors.reset} in ${cwd}`
        );
        return { success: true, output: '' };
    }

    try {
        const result = execSync(command, {
            cwd,
            stdio: options.silent ? 'pipe' : 'inherit',
            encoding: 'utf8',
        });
        return { success: true, output: result };
    } catch (error) {
        return { success: false, error: error.message, output: error.stdout };
    }
}

function checkGitStatus(projectPath, projectName, isDryRun = false) {
    log(`  Checking git status in ${projectName}...`);
    const result = execCommand('git status --porcelain', projectPath, {
        silent: true,
        dryRun: isDryRun,
    });

    if (!result.success) {
        logError(`Failed to check git status in ${projectName}`);
        return false;
    }

    if (result.output.trim()) {
        logWarning(`${projectName} has uncommitted changes:`);
        log(result.output);
        return false;
    }

    logSuccess(`${projectName} working directory is clean`);
    return true;
}

function createBranch(projectPath, projectName, branchName, isDryRun = false) {
    log(`  Checking branch status for '${branchName}' in ${projectName}...`);

    // Check current branch first
    const currentBranchResult = execCommand(
        'git branch --show-current',
        projectPath,
        { silent: true, dryRun: isDryRun }
    );
    if (currentBranchResult.success) {
        const currentBranch = currentBranchResult.output.trim();
        if (currentBranch === branchName) {
            logSuccess(`Already on branch '${branchName}' in ${projectName}`);
            return true;
        }
    }

    // Check if branch already exists
    const branchCheck = execCommand(
        `git branch --list ${branchName}`,
        projectPath,
        { silent: true, dryRun: isDryRun }
    );
    if (branchCheck.success && branchCheck.output.trim()) {
        logWarning(
            `Branch '${branchName}' already exists in ${projectName}, switching to it...`
        );
        const checkout = execCommand(
            `git checkout ${branchName}`,
            projectPath,
            { dryRun: isDryRun }
        );
        if (checkout.success) {
            logSuccess(
                `Switched to existing branch '${branchName}' in ${projectName}`
            );
        } else {
            logError(
                `Failed to switch to branch '${branchName}' in ${projectName}`
            );
        }
        return checkout.success;
    }

    // Create and checkout new branch
    log(`  Creating new branch '${branchName}' in ${projectName}...`);
    const result = execCommand(`git checkout -b ${branchName}`, projectPath, {
        dryRun: isDryRun,
    });
    if (result.success) {
        logSuccess(
            `Created and checked out branch '${branchName}' in ${projectName}`
        );
    } else {
        logError(`Failed to create branch in ${projectName}`);
    }

    return result.success;
}

function upgradeDependencies(projectPath, projectName, isDryRun = false) {
    log(`  Running ncu in ${projectName}...`);

    // Check if package.json exists
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        logWarning(`No package.json found in ${projectName}, skipping...`);
        return true;
    }

    // Run ncu with React exclusions
    const ncuCommand =
        'ncu --upgrade --reject react,react-dom,@types/react,@types/react-dom';
    log(`    Command: ${ncuCommand}`);

    const result = execCommand(ncuCommand, projectPath, { dryRun: isDryRun });
    if (result.success) {
        logSuccess(`Dependencies upgraded in ${projectName}`);

        // Install updated dependencies
        log(`  Installing updated dependencies in ${projectName}...`);
        const installResult = execCommand('npm install', projectPath, {
            dryRun: isDryRun,
        });
        if (installResult.success) {
            logSuccess(`Dependencies installed in ${projectName}`);
        } else {
            logError(`Failed to install dependencies in ${projectName}`);
            return false;
        }
    } else {
        logError(`Failed to upgrade dependencies in ${projectName}`);
        return false;
    }

    return true;
}

function runBuild(isDryRun = false) {
    log(`  Running dev-build.js -b to verify all projects build correctly...`);

    const buildScript = path.join(__dirname, 'dev-build.js');
    const buildCommand = `node "${buildScript}" -b${isDryRun ? ' --dry-run' : ''}`;
    const result = execCommand(buildCommand, process.cwd(), {
        dryRun: isDryRun,
    });

    if (result.success) {
        logSuccess('All projects built successfully!');
    } else {
        logError('Build failed after dependency upgrades');
        logWarning('You may need to fix compatibility issues manually');
    }

    return result.success;
}

async function main() {
    const args = process.argv.slice(2);
    const branchName = args.find((arg) => !arg.startsWith('-'));
    const isDryRun = args.includes('--dry-run') || args.includes('-d');

    if (!branchName) {
        showHelp();
        process.exit(1);
    }

    log(
        `${colors.bright}${colors.magenta}🚀 Starting Composaic Dependency Upgrade Process${colors.reset}`
    );
    log(
        `${colors.bright}Branch name:${colors.reset} ${colors.yellow}${branchName}${colors.reset}`
    );

    if (isDryRun) {
        log(
            `${colors.bright}${colors.yellow}🔍 DRY RUN MODE - No changes will be made${colors.reset}`
        );
    }
    log('');

    // Define project paths
    const projects = [
        { name: 'core', path: path.resolve(__dirname, '..') },
        { name: 'web', path: path.resolve(__dirname, '../../web') },
        { name: 'demo', path: path.resolve(__dirname, '../../demo') },
        {
            name: 'plugin-template',
            path: path.resolve(
                __dirname,
                '../../demo/applications/plugin-template'
            ),
        },
        {
            name: 'test-plugin-one',
            path: path.resolve(
                __dirname,
                '../../demo/applications/test-plugin-one'
            ),
        },
    ];

    // Step 1: Check git status in all projects
    logStep(1, 'Checking git status in all projects');
    for (const project of projects) {
        if (!fs.existsSync(project.path)) {
            logWarning(`Project directory not found: ${project.path}`);
            continue;
        }

        if (!checkGitStatus(project.path, project.name, isDryRun)) {
            logError(
                `Please commit or stash changes in ${project.name} before continuing`
            );
            process.exit(1);
        }
    }

    // Step 2: Create branches in all projects
    logStep(2, 'Creating branches in all projects');
    for (const project of projects) {
        if (!fs.existsSync(project.path)) {
            continue;
        }

        if (!createBranch(project.path, project.name, branchName, isDryRun)) {
            logError(`Failed to create branch in ${project.name}`);
            process.exit(1);
        }
    }

    // Step 3: Upgrade dependencies in all projects
    logStep(3, 'Upgrading dependencies in all projects');
    for (const project of projects) {
        if (!fs.existsSync(project.path)) {
            continue;
        }

        if (!upgradeDependencies(project.path, project.name, isDryRun)) {
            logError(`Failed to upgrade dependencies in ${project.name}`);
            process.exit(1);
        }
    }

    // Step 4: Run build to verify everything works
    logStep(4, 'Building all projects to verify upgrades');
    const buildSuccess = runBuild(isDryRun);

    // Final summary
    log(`\n${colors.bright}${colors.magenta}📋 UPGRADE SUMMARY${colors.reset}`);
    log(
        `${colors.bright}Branch created:${colors.reset} ${colors.yellow}${branchName}${colors.reset}`
    );
    log(
        `${colors.bright}Projects processed:${colors.reset} ${projects
            .filter((p) => fs.existsSync(p.path))
            .map((p) => p.name)
            .join(', ')}`
    );
    log(
        `${colors.bright}Dependencies upgraded:${colors.reset} ${colors.green}✅ (excluding React 19)${colors.reset}`
    );
    log(
        `${colors.bright}Build verification:${colors.reset} ${buildSuccess ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`
    );

    if (buildSuccess) {
        log(
            `\n${colors.green}${colors.bright}🎉 Dependency upgrade completed successfully!${colors.reset}`
        );
        log(`${colors.cyan}Next steps:${colors.reset}`);
        log(`  1. Test your applications thoroughly`);
        log(
            `  2. Commit the changes: ${colors.yellow}git add . && git commit -m "chore: upgrade dependencies"${colors.reset}`
        );
        log(
            `  3. Push the branch: ${colors.yellow}git push origin ${branchName}${colors.reset}`
        );
        log(`  4. Create pull requests for review`);
    } else {
        log(
            `\n${colors.red}${colors.bright}⚠️  Dependency upgrade completed with build errors${colors.reset}`
        );
        log(`${colors.cyan}Next steps:${colors.reset}`);
        log(`  1. Fix any compatibility issues`);
        log(
            `  2. Run ${colors.yellow}npm run dev-build -- -b${colors.reset} to test builds`
        );
        log(`  3. Commit fixes and test thoroughly`);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logError(`Uncaught exception: ${error.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logError(`Unhandled rejection at: ${promise}, reason: ${reason}`);
    process.exit(1);
});

// Run the script
main().catch((error) => {
    logError(`Script failed: ${error.message}`);
    process.exit(1);
});

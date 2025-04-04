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

#!/bin/bash

# Print styled message with emoji
log() {
    local emoji=$1
    local message=$2
    echo "$emoji $message"
}

# Show help message
show_help() {
    log "ℹ️" "Branch Creation Script"
    echo
    log "📋" "Usage:"
    echo "    ./create-branch.sh [options] <branch-name>"
    echo
    log "🔧" "Options:"
    echo "    --dry-run    Show commands without executing them"
    echo "    --help       Show this help message"
    echo
    log "📝" "Examples:"
    echo "    ./create-branch.sh feature/my-feature"
    echo "    ./create-branch.sh --dry-run feature/my-feature"
    echo
    exit 0
}

# Execute or simulate command based on dry run mode
execute() {
    local command=$1
    if [ "$DRY_RUN" = true ]; then
        log "🔍" "Would execute: $command"
    else
        eval "$command"
        return $?
    fi
}

# Parse arguments
DRY_RUN=false
BRANCH_NAME=""

# Show help if no arguments provided
if [ $# -eq 0 ]; then
    show_help
fi

while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            BRANCH_NAME="$1"
            shift
            ;;
    esac
done

# Check if branch name is provided
if [ -z "$BRANCH_NAME" ]; then
    log "❌" "Please provide a branch name as an argument"
    log "💡" "Use --help to see usage information"
    exit 1
fi

if [ "$DRY_RUN" = true ]; then
    log "🎭" "Running in dry-run mode (no changes will be made)"
fi

# Update project list to match actual workspace structure
PROJECTS=("core" "web" "demo")
ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PARENT_DIR=$(dirname "$ROOT_DIR")

for project in "${PROJECTS[@]}"; do
    PROJECT_PATH="$PARENT_DIR/$project"
    
    if [ ! -d "$PROJECT_PATH" ]; then
        log "⚠️" "Project directory not found: $project"
        continue
    fi
    
    if [ ! -d "$PROJECT_PATH/.git" ]; then
        log "⚠️" "Not a git repository: $project"
        continue
    fi
    
    log "🔄" "Switching to project: $project"
    execute "cd \"$PROJECT_PATH\"" || continue
    
    # Check for uncommitted changes
    if ! execute "git diff --quiet && git diff --cached --quiet"; then
        log "❌" "Uncommitted changes detected in $project. Please commit or stash them first."
        continue
    fi
    
    # Fetch latest changes from main
    log "⬇️" "Fetching latest changes from main"
    execute "git fetch origin main" || continue
    
    # Switch to main and reset to origin/main
    log "🔄" "Updating main branch"
    execute "git checkout main" || continue
    execute "git reset --hard origin/main" || continue
    
    # Create and switch to new branch
    log "🌱" "Creating new branch: $BRANCH_NAME"
    execute "git checkout -b \"$BRANCH_NAME\"" || continue
    
    log "✅" "Successfully set up branch in $project"
    echo
done

if [ "$DRY_RUN" = true ]; then
    log "🎭" "Dry run completed - no changes were made"
else
    log "🎉" "Branch '$BRANCH_NAME' created in all projects"
fi
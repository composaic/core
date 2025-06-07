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

# Execute command depending on whether it's read-only or state-changing
execute() {
    local command=$1
    local read_only=${2:-false}

    # Always execute read-only commands, even in dry run mode
    if [ "$read_only" = true ] || [ "$DRY_RUN" = false ]; then
        eval "$command"
        return $?
    else
        log "🔍" "Would execute: $command"
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
    # Directory changes must always execute for git commands to work
    cd "$PROJECT_PATH" || {
        log "❌" "Failed to switch to directory: $PROJECT_PATH"
        continue
    }
    
    # Check for uncommitted changes (read-only operation)
    if ! execute "git diff --quiet && git diff --cached --quiet" true; then
        log "❌" "Uncommitted changes detected in $project. Please commit or stash them first."
        continue
    fi
    
    # Fetch latest changes from main (network operation but doesn't change state)
    log "⬇️" "Fetching latest changes from main"
    execute "git fetch origin main" true || continue
    
    # Get current branch (read-only operation)
    CURRENT_BRANCH=$(execute "git rev-parse --abbrev-ref HEAD" true)
    
    # Switch to main and reset to origin/main if needed
    if [ "$CURRENT_BRANCH" != "main" ]; then
        log "🔄" "Updating main branch"
        execute "git checkout main" || continue
        execute "git reset --hard origin/main" || continue
    fi
    
    # Check if we're already on the target branch
    if [ "$CURRENT_BRANCH" = "$BRANCH_NAME" ]; then
        log "✓" "Already on branch '$BRANCH_NAME' in $project"
        continue
    fi

    # Check if branch exists (read-only operation)
    if execute "git show-ref --verify --quiet refs/heads/$BRANCH_NAME" true; then
        log "🔄" "Switching to existing branch: $BRANCH_NAME"
        execute "git checkout \"$BRANCH_NAME\"" || continue
    else
        log "🌱" "Creating new branch: $BRANCH_NAME"
        execute "git checkout -b \"$BRANCH_NAME\"" || continue
    fi
    
    log "✅" "Successfully set up branch in $project"
    echo
done

if [ "$DRY_RUN" = true ]; then
    log "🎭" "Dry run completed - no changes were made"
else
    log "🎉" "Branch '$BRANCH_NAME' created in all projects"
fi
#!/bin/bash

# Print styled message with emoji
log() {
    local emoji=$1
    local message=$2
    echo "$emoji $message"
}

# Show help message
show_help() {
    log "ℹ️" "Branch Cleanup Script"
    echo
    log "📋" "Usage:"
    echo "    ./cleanup-branches.sh [options]"
    echo
    log "🔧" "Options:"
    echo "    --dry-run    Show branches that would be deleted without deleting them"
    echo "    --help       Show this help message"
    echo
    log "🧹" "This script will clean up:"
    echo "    1. Local branches that have been merged into main"
    echo "    2. Local branches whose remote tracking branch is gone"
    echo
    log "⚠️" "Note: The script will not run if there are uncommitted changes"
    echo
    exit 0
}

# Execute or simulate command based on dry run mode
execute() {
    local command=$1
    if [ "$DRY_RUN" = true ]; then
        log "🔍" "Would execute: $command"
        return 0
    else
        eval "$command"
        return $?
    fi
}

# Check for uncommitted changes
check_uncommitted_changes() {
    if [ "$DRY_RUN" = true ]; then
        return 0
    fi
    
    if ! git diff --quiet HEAD; then
        log "❌" "Uncommitted changes detected in $(basename $(pwd))"
        log "💡" "Please commit or stash your changes first"
        return 1
    fi
    return 0
}

# Switch to main branch and update it
update_main_branch() {
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    
    # First fetch all changes
    log "⬇️" "Fetching latest changes"
    if ! execute "git fetch origin"; then
        return 1
    fi
    
    # Switch to main
    log "🔄" "Switching to main branch"
    if ! execute "git checkout main"; then
        log "❌" "Failed to switch to main branch"
        return 1
    fi
    
    # Update main
    log "⬆️" "Updating main branch"
    if ! execute "git reset --hard origin/main"; then
        log "❌" "Failed to update main branch"
        return 1
    fi
    
    return 0
}

# Get list of merged branches
get_merged_branches() {
    git branch --merged main | grep -vE '^\*|main$' || true
}

# Get list of branches with deleted remotes
get_gone_branches() {
    git branch -vv | grep ': gone]' | awk '{print $1}' || true
}

# Initialize counters
TOTAL_MERGED=0
TOTAL_GONE=0
TOTAL_PROJECTS=0
SKIPPED_PROJECTS=0

# Parse arguments
DRY_RUN=false

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
            log "❌" "Unknown option: $1"
            log "💡" "Use --help to see usage information"
            exit 1
            ;;
    esac
done

if [ "$DRY_RUN" = true ]; then
    log "🎭" "Running in dry-run mode (no branches will be deleted)"
fi

# Update project list to match workspace structure
PROJECTS=("core" "web" "demo")
ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PARENT_DIR=$(dirname "$ROOT_DIR")

for project in "${PROJECTS[@]}"; do
    PROJECT_PATH="$PARENT_DIR/$project"
    
    if [ ! -d "$PROJECT_PATH" ]; then
        log "⚠️" "Project directory not found: $project"
        ((SKIPPED_PROJECTS++))
        continue
    fi
    
    if [ ! -d "$PROJECT_PATH/.git" ]; then
        log "⚠️" "Not a git repository: $project"
        ((SKIPPED_PROJECTS++))
        continue
    fi
    
    ((TOTAL_PROJECTS++))
    
    log "🔄" "Checking project: $project"
    execute "cd \"$PROJECT_PATH\"" || { ((SKIPPED_PROJECTS++)); continue; }
    
    # Check for uncommitted changes
    if ! check_uncommitted_changes; then
        ((SKIPPED_PROJECTS++))
        continue
    fi
    
    # Switch to and update main branch
    if ! update_main_branch; then
        log "❌" "Failed to update main branch in $project"
        ((SKIPPED_PROJECTS++))
        continue
    fi
    
    # Check for merged branches
    log "🔍" "Checking for merged branches..."
    MERGED=$(get_merged_branches)
    if [ -n "$MERGED" ]; then
        BRANCH_COUNT=$(echo "$MERGED" | wc -l)
        ((TOTAL_MERGED+=BRANCH_COUNT))
        log "📊" "Found $BRANCH_COUNT merged branch(es):"
        echo "$MERGED" | sed 's/^/  /'
        if [ "$DRY_RUN" = false ]; then
            echo "$MERGED" | xargs git branch -d
        fi
    else
        log "✨" "No merged branches found"
    fi
    
    # Check for branches with deleted remotes
    log "🔍" "Checking for branches with deleted remotes..."
    GONE=$(get_gone_branches)
    if [ -n "$GONE" ]; then
        BRANCH_COUNT=$(echo "$GONE" | wc -l)
        ((TOTAL_GONE+=BRANCH_COUNT))
        log "📊" "Found $BRANCH_COUNT branch(es) with deleted remotes:"
        echo "$GONE" | sed 's/^/  /'
        if [ "$DRY_RUN" = false ]; then
            echo "$GONE" | xargs git branch -d
        fi
    else
        log "✨" "No branches with deleted remotes found"
    fi
    
    log "✅" "Finished checking $project"
    echo
done

# Print summary
log "📈" "Summary:"
echo "  Projects checked: $TOTAL_PROJECTS"
[ $SKIPPED_PROJECTS -gt 0 ] && echo "  Projects skipped: $SKIPPED_PROJECTS"
echo "  Total merged branches found: $TOTAL_MERGED"
echo "  Total branches with deleted remotes: $TOTAL_GONE"
echo "  Total branches to clean: $((TOTAL_MERGED + TOTAL_GONE))"

if [ "$DRY_RUN" = true ]; then
    log "🎭" "Dry run completed - no branches were deleted"
else
    if [ $((TOTAL_MERGED + TOTAL_GONE)) -eq 0 ]; then
        log "✨" "No branches needed cleaning"
    else
        log "🎉" "Successfully cleaned up $((TOTAL_MERGED + TOTAL_GONE)) branch(es)"
    fi
fi
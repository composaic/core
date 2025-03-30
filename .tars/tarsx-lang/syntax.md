# TARSX Language Specification v0.1

## Introduction

TARSX is an instruction set for AI task execution that emphasizes efficient batch operations and minimizing API/tool usage. It provides a structured way to describe complex operations while optimizing for performance and resource utilization.

## Case Sensitivity

- Keywords are case-insensitive (e.g., 'version' or 'VERSION')
- String literals and variables are case-sensitive
- By convention, keywords are written in lowercase

## Script Structure

### Copyright and Version (Required)

Every script must start with:

```tarsx
# TARSX Conversation Script Language (C) TARS & JJ 2025
version 0.1
```

### Metadata and Resources (Required)

```tarsx
name "Script Name"
description "Script purpose and functionality"
requires ["resource1", "resource2"]  # Optional but recommended
```

### Project Definitions (Optional)

Projects can be defined to establish directory paths that can be referenced throughout the script:

```tarsx
projects {
    core "/path/to/core"
    web "/path/to/web"
    demo "/path/to/demo"
}
```

### Context Management (Required before commands)

Context management is crucial for command execution in the correct directory.

1. **Defining Contexts**: Use the `context` command to define working directories:

```tarsx
init {
    context "core" {
        path "${projects.core}"
    }
    context "web" {
        path "/direct/path/to/web"
    }
}
```

2. **Context Selection**: Use `use-context` to switch working directory:

```tarsx
use-context "core"    # cd to the core context path
step "Update Dependencies" {
    run "npm install"  # Runs in current directory
}
```

Important rules:

- The `context` command defines a named directory path
- `use-context` changes the current working directory
- Every command executes in the current working directory
- Working directory persists until explicitly changed
- Commands execute sequentially in the same terminal

## Batch Operations

### Preparation Phase

Define variables and gather information upfront:

```tarsx
prepare "Setup Environment" {
    set base_dir = "/path/to/project"
    set projects = ["core", "web", "demo"]

    gather "Project Information" {
        query "Package Files" {
            "*/package.json"
            ["dependencies", "scripts"]
        }
    }
}
```

### Execution Phase

Group related operations into batches:

```tarsx
batch "Dependency Updates" {
    expect "All dependencies updated successfully"

    use-terminal "core"  # Set terminal context
    step "Update Dependencies" {
        run "batch-update-command"
    }

    validate {
        require "No conflicting dependencies"
        require "All packages resolved"
    }

    on_failure {
        log "Batch update failed"
        rollback "npm unlink"  # Optional rollback command
        exit 1
    }
}
```

## Control Structures

### Conditional Execution

```tarsx
if condition {
    batch "Conditional Operations" {
        use-terminal "core"
        step "Conditional Step" {
            run "command"
        }
    }
}
```

### Loops

```tarsx
for project in ${projects} {
    batch "Process ${project}" {
        use-terminal "${project}"
        step "Process" {
            run "command"
        }
    }
}
```

### User Interaction

```tarsx
ask "Proceed with deployment?" {
    on "yes" -> {
        batch "Deployment" {
            use-terminal "core"
            step "Deploy" {
                run "npm run deploy"
            }
        }
    }
    on "no" -> exit 0
}
```

## Data Types

- Strings: `"value"`
- Numbers: `42`
- Lists: `["one", "two"]`
- Objects: `{ "key": "value" }`
- Booleans: `true`, `false`

## Variable Substitution

Use `${variable_name}` syntax for variables and `${project.path}` for project paths:

```tarsx
init {
    terminal "core" {
        path "${projects.core}"
        initialize true
    }
}

batch "Process ${project}" {
    use-terminal "core"
    run "command --path=${base_dir}/${project}"
}
```

## Error Handling

```tarsx
batch "Critical Operations" {
    use-terminal "core"
    step "Critical Step" {
        run "critical-command"
    }

    on_failure {
        log "Operation failed"
        rollback "cleanup-command"  # Optional rollback command
        exit 1
    }
}
```

## Resource Queries

```tarsx
query "Find Configurations" {
    "config/*.json"           # Path pattern
    ["settings", "version"]   # Required data
}
```

## Reserved Keywords

- version
- name
- description
- requires
- projects
- init
- terminal
- initialize
- use-terminal
- prepare
- gather
- query
- batch
- step
- validate
- if/else
- for/in
- ask
- set
- run
- exit
- log
- on_failure
- expect
- require
- rollback

## Best Practices

1. Always declare required resources upfront
2. Use init block for terminal definitions and initialization
3. Always set terminal context before running commands
4. Group related operations into batches
5. Gather information efficiently
6. Use validation checks for batch operations
7. Include clear error handling
8. Add descriptive comments for complex operations
9. Remember all commands execute synchronously
10. Use project definitions to maintain path consistency

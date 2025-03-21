# TARSX Language Specification v0.1

## Introduction

TARSX is an instruction set for AI task execution that emphasizes efficient batch operations and minimizing API/tool usage. It provides a structured way to describe complex operations while optimizing for performance and resource utilization.

## Case Sensitivity

- Keywords are case-insensitive (e.g., 'version' or 'VERSION')
- String literals and variables are case-sensitive
- By convention, keywords are written in lowercase

## Core Concepts

- **Batch Operations**: Group related operations together to minimize API calls
- **Information Gathering**: Collect required data upfront in batches
- **Resource Definition**: Declare required resources at the start
- **Efficient Execution**: Optimize operations to minimize tool usage

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

  step "Update Dependencies" {
    run "batch-update-command"
  }

  validate {
    require "No conflicting dependencies"
    require "All packages resolved"
  }

  on_failure {
    log "Batch update failed"
    exit 1
  }
}
```

## Control Structures

### Conditional Execution

```tarsx
if condition {
  batch "Conditional Operations" {
    # Batch operations here
  }
}
```

### Loops

```tarsx
for project in ${projects} {
  batch "Process ${project}" {
    # Batch operations here
  }
}
```

### User Interaction

```tarsx
ask "Proceed with deployment?" {
  on "yes" -> {
    batch "Deployment" {
      # Deployment operations
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

## Error Handling

```tarsx
batch "Critical Operations" {
  on_failure {
    log "Operation failed"
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

## Variable Substitution

Use `${variable_name}` syntax:

```tarsx
batch "Process ${project}" {
  run "command --path=${base_dir}/${project}"
}
```

## Reserved Keywords

- version
- name
- description
- requires
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

## Best Practices

1. Always declare required resources upfront
2. Group related operations into batches
3. Gather information efficiently
4. Use validation checks for batch operations
5. Include clear error handling
6. Add descriptive comments for complex operations

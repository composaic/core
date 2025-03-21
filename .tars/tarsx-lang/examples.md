# TARSX Examples

This document contains practical examples of TARSX scripts for common development workflows.

## 1. Dependency Upgrade Workflow

```tarsx
VERSION 0.1

NAME "Dependency Upgrade"
DESCRIPTION "Upgrade dependencies across core, web, and demo projects"

# Set base directory for Composaic projects
SET base_dir = "/Users/johnny/dev/composaic"
SET projects = ["core", "web", "demo"]

# Check each project exists
FOR project IN ${projects} {
  IF NOT exists "${base_dir}/${project}/package.json" {
    LOG "Error: ${project} project not found"
    EXIT 1
  }
}

# Upgrade core dependencies first
STEP "Upgrade Core Dependencies" {
  EXPECT "Core dependencies updated successfully"
  RUN "cd ${base_dir}/core && npx ncu -u && npm install"

  ON_FAILURE {
    LOG "Failed to upgrade core dependencies"
    EXIT 1
  }
}

# Run core tests
STEP "Test Core" {
  EXPECT "All core tests passing"
  RUN "cd ${base_dir}/core && npm test"
}

# Build core project
STEP "Build Core" {
  EXPECT "Core build successful"
  RUN "cd ${base_dir}/core && npm run build"
}

# Update and build web and demo projects
FOR project IN ["web", "demo"] {
  STEP "Upgrade ${project} Dependencies" {
    EXPECT "${project} dependencies updated"
    RUN "cd ${base_dir}/${project} && npx ncu -u && npm install"
  }

  STEP "Build ${project}" {
    EXPECT "${project} build successful"
    RUN "cd ${base_dir}/${project} && npm run build"
  }
}

# Final verification
CHECKPOINT "Verify All Projects" {
  REQUIRE "Core tests passing"
  REQUIRE "Core build successful"
  REQUIRE "Web build successful"
  REQUIRE "Demo build successful"
}

# Optional deployment prompt
ASK "Deploy updates to staging?" {
  ON "yes" -> {
    STEP "Deploy to Staging" {
      RUN "npm run deploy:staging"
    }
  }
  ON "no" -> CONTINUE
}
```

## 2. Release Process Example

```tarsx
VERSION 0.1

NAME "Release Process"
DESCRIPTION "Create and publish a new release"

SET version = ""

# Get version number
ASK "Enter new version number:" {
  SET version = INPUT
}

STEP "Update Version" {
  RUN "npm version ${version} --no-git-tag-version"
}

STEP "Update Changelog" {
  EXPECT "CHANGELOG.md updated"
  RUN "git log --pretty=format:'- %s' $(git describe --tags --abbrev=0)..HEAD > temp_changes"
}

ASK "Review changes and confirm:" {
  ON "yes" -> CONTINUE
  ON "no" -> EXIT 0
}

STEP "Create Release" {
  RUN "git add ."
  RUN "git commit -m 'Release ${version}'"
  RUN "git tag v${version}"
  RUN "git push origin main --tags"
}
```

## 3. Development Environment Setup

```tarsx
VERSION 0.1

NAME "Dev Environment Setup"
DESCRIPTION "Set up a new development environment"

# Check required tools
STEP "Check Prerequisites" {
  EXPECT "All required tools available"
  RUN "node --version"
  RUN "npm --version"
  RUN "git --version"
}

# Clone repositories
FOR repo IN ["core", "web", "demo"] {
  STEP "Clone ${repo}" {
    IF NOT exists "${repo}" {
      RUN "git clone https://github.com/composaic/${repo}.git"
    }
  }
}

# Install dependencies
FOR repo IN ["core", "web", "demo"] {
  STEP "Setup ${repo}" {
    RUN "cd ${repo} && npm install"
  }
}

# Build projects in correct order
STEP "Build Core" {
  RUN "cd core && npm run build"
}

FOR project IN ["web", "demo"] {
  STEP "Build ${project}" {
    EXPECT "${project} built successfully"
    RUN "cd ${project} && npm run build"
  }
}

CHECKPOINT "Verify Setup" {
  REQUIRE "All repositories cloned"
  REQUIRE "Dependencies installed"
  REQUIRE "Build successful"
}
```

## Best Practices

1. Always include VERSION, NAME, and DESCRIPTION
2. Use descriptive step names
3. Include EXPECT clauses for clear success criteria
4. Add error handling with ON_FAILURE blocks
5. Use CHECKPOINTs for critical verification points
6. Break down complex workflows into clear steps
7. Use variables to avoid repetition
8. Include user interaction points where decisions are needed
9. Add comments for complex operations

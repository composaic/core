# TARSX Language Specification - Version 0.1

## Current Features

### Core Language Elements

- Version declaration (required)
- Script metadata (NAME, DESCRIPTION)
- Variables and substitution
- Basic control flow (STEP, IF/ELSE)
- Loops (FOR)
- Error handling (ON_FAILURE)
- User interaction (ASK)
- Checkpoints (CHECKPOINT)
- Comments (single-line and block)

### Data Types

- Strings
- Numbers
- Lists
- Booleans

### Keywords

- VERSION
- NAME
- DESCRIPTION
- SET
- STEP
- IF
- ELSE
- FOR
- IN
- ASK
- CHECKPOINT
- RUN
- EXIT
- CONTINUE
- RETRY
- LOG
- ON_FAILURE
- REQUIRE
- EXPECT

## Script Validation

Scripts are validated to ensure:

1. Required version declaration is present
2. All used keywords are supported in v0.1
3. Syntax follows the v0.1 specification
4. Required metadata (NAME, DESCRIPTION) is included

## Future Compatibility Note

We will maintain backward compatibility as the language evolves. Future versions will be additive, ensuring v0.1 scripts continue to work as expected.

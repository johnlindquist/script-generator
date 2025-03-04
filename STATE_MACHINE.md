# Script Generation State Machine

This document outlines the state machine that powers the script generation flow.

## States Overview

The state machine has the following main states:

1. `idle` - Initial state, waiting for user input
2. `thinkingDraft` - Preparing for draft generation
3. `generatingDraft` - Generating the draft script
4. `complete` - Generation complete, script ready
5. `saving` - Saving the script
6. `installing` - Saving and installing the script

## State Details

### 1. `idle`

- **Entry Actions**: Reset context values (prompt, error, etc.)
- **Events**:
  - `SET_PROMPT`: Updates the prompt
  - `FROM_SUGGESTION`: Updates suggestion status
  - `SET_LUCKY_REQUEST`: Sets lucky request ID
  - `GENERATE_DRAFT`: Transitions to `thinkingDraft`
  - `UPDATE_EDITABLE_SCRIPT`: Updates editable script
  - `SET_ERROR`: Sets error message
  - `SET_SCRIPT_ID`: Sets script ID
  - `SET_USAGE`: Updates usage count and limit
  - `RESET_MACHINE`: Resets all context values

### 2. `thinkingDraft`

- **Entry Actions**: Clear error and generated script, set request ID
- **Events**:
  - `START_STREAMING_DRAFT`: Transitions to `generatingDraft`
  - `CANCEL_GENERATION`: Transitions to `idle`

### 3. `generatingDraft`

- **Invoke**: `generateDraftScript` service
- **Events**:
  - `UPDATE_EDITABLE_SCRIPT`: Updates editable script
  - `SET_ERROR`: Sets error message
  - `CANCEL_GENERATION`: Transitions to `idle`
- **On Done**: Transitions to `complete` with scriptId set

### 4. `complete`

- **Events**:
  - `RESET`: Transitions to `idle`
  - `SAVE_SCRIPT`: Transitions to `saving`
  - `SAVE_AND_INSTALL`: Transitions to `installing`

### 5. `saving`

- **Invoke**: `saveScriptService`
- **On Done**: Transitions to `idle`
- **On Error**: Transitions to `complete` with error set

### 6. `installing`

- **Invoke**: `saveAndInstallService`
- **On Done**: Transitions to `idle`
- **On Error**: Transitions to `complete` with error set

## State Transitions

```
┌─────────┐
│   idle  │◄────────────────────────────┐
└────┬────┘                             │
     │                                  │
     │ GENERATE_DRAFT                   │
     ▼                                  │
┌────────────┐                          │
│thinkingDraft│                         │
└─────┬──────┘                          │
      │                                 │
      │ START_STREAMING_DRAFT           │
      ▼                                 │
┌──────────────┐                        │
│generatingDraft│───────► ┌─────────┐   │
└──────────────┘  onDone │complete │   │
                         └────┬────┘   │
                              │        │
                              │        │
                 ┌────────────┴────────┐
                 │                     │
                 │                     │
            SAVE_SCRIPT         SAVE_AND_INSTALL
                 │                     │
                 ▼                     ▼
            ┌─────────┐         ┌───────────┐
            │  saving │         │ installing │
            └────┬────┘         └─────┬─────┘
                 │                    │
                 └────────────────────┘
                          │
                          ▼
                        idle
```

## Context

The state machine maintains the following context:

- `prompt`: User input prompt
- `editableScript`: Current script content in editor
- `generatedScript`: Final generated script
- `error`: Error message, if any
- `usageCount`: Current usage count
- `usageLimit`: Maximum usage limit
- `requestId`: Request ID for current generation
- `isFromSuggestion`: Whether prompt is from suggestion
- `scriptId`: ID of the script in database
- `interactionTimestamp`: Timestamp for logging
- `isFromLucky`: Whether using "I'm Feeling Lucky"
- `luckyRequestId`: Request ID for lucky generation

## Implementation Notes

- The state machine uses XState v5 with the `setup` function
- Actions are typed using the `setup` approach
- Services are implemented using `fromPromise`
- State transitions are logged for analytics

## Potential Issues

- Error handling in services should be comprehensive
- The transition from `generatingDraft` to `complete` could have race conditions
- Usage limits should be enforced consistently

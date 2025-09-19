# XState Script Generation State Machine Flow

## Overview
Complete state machine flow managing the script generation lifecycle, from idle to completion with all transitions and side effects.

## Trigger Points
- Component mount initializes machine
- User interactions trigger events
- API responses trigger transitions
- Error conditions trigger error states

## Flow Diagram
```mermaid
graph TD
    A[Machine Created] --> B[Initial Context]
    B --> C[State: idle]

    C --> D{Event Received}

    D -->|SET_PROMPT| E[Update Prompt]
    E --> C

    D -->|FROM_SUGGESTION| F[Set Suggestion Flag]
    F --> G[Update Prompt]
    G --> C

    D -->|UPDATE_USAGE| H[Update Usage Count]
    H --> C

    D -->|GENERATE_DRAFT| I[Check Prompt Length]
    I --> J{Valid?}

    J -->|No| K[Show Error Toast]
    K --> C

    J -->|Yes| L[State: thinkingDraft]
    L --> M[Generate Request ID]
    M --> N[Set Timestamp]
    N --> O[Log State Entry]

    O --> P{Auto Event}
    P -->|START_STREAMING_DRAFT| Q[State: generatingDraft]

    Q --> R[Invoke: generateDraftScript]
    R --> S[Start API Stream]

    S --> T{Stream Event}
    T -->|UPDATE_EDITABLE_SCRIPT| U[Update Editor Content]
    U --> V[Accumulate Script]
    V --> T

    T -->|COMPLETE_GENERATION| W[State: complete]
    T -->|SET_ERROR| X[Set Error Context]
    X --> Y[Log Error]
    Y --> Z[Show Error UI]
    Z --> AA[Stay in State]

    T -->|CANCEL_GENERATION| AB[State: idle]
    AB --> AC[Reset Context]

    W --> AD[Set Generated Script]
    AD --> AE[Log Completion]
    AE --> AF{User Action}

    AF -->|UPDATE_EDITABLE_SCRIPT| AG[Update Editor]
    AG --> W

    AF -->|RESET| AH[State: idle]
    AH --> AI[Clear All Context]

    AF -->|REFINE_SCRIPT| AJ[Update Prompt]
    AJ --> AK[New Refinement ID]
    AK --> L

    AF -->|SAVE_SCRIPT| AL[State: saving]
    AL --> AM[Invoke: saveScript]
    AM --> AN[API: Save to DB]
    AN --> AO{Save Result}

    AO -->|Success| AP[Update Script ID]
    AP --> AQ[Show Success Toast]
    AQ --> W

    AO -->|Error| AR[Show Error Toast]
    AR --> W

    AF -->|SAVE_AND_INSTALL| AS[State: savingAndInstalling]
    AS --> AT[Invoke: saveAndInstallScript]
    AT --> AU[API: Save & Track]
    AU --> AV{Install Result}

    AV -->|Success| AW[Update Script ID]
    AW --> AX[Show Success Toast]
    AX --> AY[Track Installation]
    AY --> W

    AV -->|Error| AZ[Show Error Toast]
    AZ --> W

    %% Guards
    BA[Guard: canGenerate] --> BB{Prompt >= 15 chars?}
    BB -->|Yes| BC[Allow Transition]
    BB -->|No| BD[Block Transition]

    %% Actions
    BE[Action: logStateTransition]
    BF[Action: showToast]
    BG[Action: logInteraction]
```

## Key Components
- **File**: `components/ScriptGenerationMachine.ts` - State machine definition
- **States**: idle, thinkingDraft, generatingDraft, complete, saving, savingAndInstalling
- **Events**: SET_PROMPT, GENERATE_DRAFT, UPDATE_EDITABLE_SCRIPT, COMPLETE_GENERATION, SAVE_SCRIPT, RESET
- **Guards**: canGenerate (prompt validation)
- **Actions**: assign, logStateTransition, toast notifications
- **Services**: generateDraftScript, saveScript, saveAndInstallScript

## Data Flow
1. Input: Machine Context
   ```typescript
   {
     prompt: string,
     editableScript: string,
     generatedScript: string | null,
     error: string | null,
     usageCount: number,
     usageLimit: number,
     requestId: string | null,
     scriptId: string | null
   }
   ```
2. Transformations:
   - Context updates via assign actions
   - State transitions trigger side effects
   - Services invoke async operations
3. Output: Updated context and state

## Error Scenarios
- Invalid prompt (< 15 characters)
- Generation service failure
- Save service failure
- Network disconnection during streaming
- Context corruption
- Invalid state transition

## Dependencies
- XState v5 library
- React integration via @xstate/react
- Toast notifications (react-hot-toast)
- API service functions
- Interaction logger
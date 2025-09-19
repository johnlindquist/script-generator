# AI Script Generation Flow

## Overview
Complete flow for generating Script Kit automation scripts using AI, from user prompt to saved script with streaming responses.

## Trigger Points
- User enters prompt and clicks "Generate" button
- User clicks "I'm Feeling Lucky" for random generation
- User selects a suggestion from carousel
- User refines existing script

## Flow Diagram
```mermaid
graph TD
    A[User Enters Prompt] --> B[ScriptGenerationClient Component]
    B --> C[XState Machine: SET_PROMPT]
    C --> D{Validate Prompt}

    D -->|< 15 chars| E[Show Error Toast]
    D -->|Valid| F[Machine: GENERATE_DRAFT]

    F --> G[State: thinkingDraft]
    G --> H[Check Usage Limits]
    H --> I{Within Limit?}

    I -->|No| J[Show Limit Error]
    I -->|Yes| K[Generate Request ID]

    K --> L[Log Interaction Start]
    L --> M[Machine: START_STREAMING_DRAFT]

    M --> N[State: generatingDraft]
    N --> O[API: /api/generate-ai-gateway]

    O --> P[Select AI Provider]
    P --> Q{Provider Available?}

    Q -->|Anthropic| R[Claude API]
    Q -->|Google| S[Gemini API]
    Q -->|OpenRouter| T[OpenRouter API]
    Q -->|Mock| U[Mock Generator]

    R --> V[Stream Response]
    S --> V
    T --> V
    U --> V

    V --> W[Transform to Script Kit Code]
    W --> X[Stream Chunks to Client]

    X --> Y[Machine: UPDATE_EDITABLE_SCRIPT]
    Y --> Z[Update Monaco Editor]
    Z --> AA{More Chunks?}

    AA -->|Yes| X
    AA -->|No| AB[Machine: COMPLETE_GENERATION]

    AB --> AC[State: complete]
    AC --> AD[Log Generation Complete]

    AD --> AE{User Action?}
    AE -->|Save| AF[Machine: SAVE_SCRIPT]
    AE -->|Install| AG[Machine: SAVE_AND_INSTALL]
    AE -->|Edit| AH[Machine: UPDATE_EDITABLE_SCRIPT]
    AE -->|Reset| AI[Machine: RESET]
    AE -->|Refine| AJ[Machine: REFINE_SCRIPT]

    AF --> AK[API: Save Script]
    AG --> AL[API: Save & Install]
    AJ --> G

    AK --> AM[Update Database]
    AL --> AM
    AM --> AN[Return Script ID]

    %% Lucky Flow
    AO[Lucky Button] --> AP[API: /api/lucky]
    AP --> AQ[Generate Random Prompt]
    AQ --> F

    %% Suggestion Flow
    AR[Select Suggestion] --> AS[Machine: FROM_SUGGESTION]
    AS --> F

    %% Error Paths
    O -->|Error| AT[Stream Error Handler]
    AT --> AU[Machine: SET_ERROR]
    AU --> AV[Show Error in UI]
```

## Key Components
- **File**: `components/ScriptGenerationClient.tsx` - Main UI component
- **File**: `components/ScriptGenerationMachine.ts` - XState state machine
- **File**: `app/api/generate-ai-gateway/route.ts` - Generation endpoint
- **File**: `lib/ai-gateway.ts` - AI provider configuration
- **File**: `lib/apiService.ts` - Client API functions
- **Function**: `generateDraftWithProvider()` - Provider routing logic
- **Function**: `streamToString()` - Stream transformation

## Data Flow
1. Input: User prompt (string, min 15 chars)
2. Transformations:
   - Prompt enhanced with system context
   - Script Kit API docs injected
   - AI model generates TypeScript code
   - Response streamed and formatted
3. Output: TypeScript script with Script Kit imports

## Error Scenarios
- AI provider API failure
- Rate limit exceeded (24/100 daily limit)
- Network timeout during streaming
- Invalid/malformed AI response
- Database save failure
- Session expired during generation

## Dependencies
- Anthropic Claude API
- Google Gemini API
- OpenRouter API (fallback)
- PostgreSQL for script storage
- Monaco Editor for code display
- XState for state management
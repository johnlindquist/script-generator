# AI Response Streaming Flow

## Overview
Real-time streaming flow for AI-generated content, from API request to progressive UI updates using Server-Sent Events (SSE).

## Trigger Points
- Generation request initiated
- Stream chunk received
- Stream completion
- Stream error/interruption

## Flow Diagram
```mermaid
graph TD
    A[Start Generation] --> B[Create Request ID]
    B --> C[Setup AbortController]
    C --> D[Create ReadableStream]

    D --> E[Fetch API Endpoint]
    E --> F[Set Headers]
    F --> G[Accept: text/event-stream]
    G --> H[Send POST Request]

    H --> I[Server Route Handler]
    I --> J[Validate Request]
    J --> K[Select AI Provider]

    K --> L[Create AI Stream]
    L --> M{Provider}
    M -->|Anthropic| N[Claude Messages API]
    M -->|Google| O[Gemini Stream API]
    M -->|OpenRouter| P[OpenRouter Stream]

    N --> Q[Transform Stream]
    O --> Q
    P --> Q

    Q --> R[Create Response Stream]
    R --> S[Return StreamingTextResponse]

    S --> T[Client Receives Stream]
    T --> U[Create Reader]
    U --> V[Read Loop Start]

    V --> W{Read Chunk}
    W -->|Data| X[Decode Chunk]
    X --> Y[Parse SSE Format]
    Y --> Z{Event Type}

    Z -->|data:| AA[Extract Content]
    Z -->|error:| AB[Handle Error]
    Z -->|done:| AC[Stream Complete]

    AA --> AD[Accumulate Text]
    AD --> AE[Dispatch UPDATE_EDITABLE_SCRIPT]
    AE --> AF[Update Monaco Editor]
    AF --> AG[Show Cursor Animation]
    AG --> V

    AB --> AH[Set Error State]
    AH --> AI[Show Error Message]
    AI --> AJ[Cancel Stream]

    AC --> AK[Final Chunk]
    AK --> AL[Dispatch COMPLETE_GENERATION]
    AL --> AM[Remove Loading State]
    AM --> AN[Enable Action Buttons]

    %% Abort Flow
    AO[User Cancels] --> AP[Trigger AbortController]
    AP --> AQ[controller.abort()]
    AQ --> AR[Close Stream]
    AR --> AS[Clean Up Resources]
    AS --> AT[Reset UI State]

    %% Retry Logic
    AU[Stream Error] --> AV{Retry Count}
    AV -->|< 3| AW[Exponential Backoff]
    AW --> AX[Wait Delay]
    AX --> AY[Retry Request]
    AY --> D

    AV -->|>= 3| AZ[Final Error]
    AZ --> BA[Fallback Provider]
    BA --> BB{Fallback Available?}
    BB -->|Yes| BC[Try Fallback]
    BB -->|No| BD[Show Final Error]

    %% Transform Pipeline
    BE[Raw AI Response] --> BF[Token Stream]
    BF --> BG[Text Decoder]
    BG --> BH[UTF-8 Decode]
    BH --> BI[Remove Prefixes]
    BI --> BJ[Format Code]
    BJ --> BK[Add Imports]
    BK --> BL[Stream to Client]

    %% Progress Tracking
    BM[Stream Progress] --> BN[Calculate Tokens]
    BN --> BO[Estimate Time]
    BO --> BP[Update Progress Bar]
    BP --> BQ[Show Percentage]

    %% Buffer Management
    BR[Chunk Buffer] --> BS[Accumulate Partial]
    BS --> BT{Complete Line?}
    BT -->|Yes| BU[Flush to UI]
    BT -->|No| BV[Wait for More]
    BU --> BW[Clear Buffer]
    BV --> BR
```

## Key Components
- **File**: `app/api/generate-ai-gateway/route.ts` - Streaming endpoint
- **File**: `lib/apiService.ts` - Client stream handler
- **File**: `lib/ai-gateway.ts` - Provider stream setup
- **Function**: `streamText()` - Vercel AI SDK streaming
- **Function**: `StreamingTextResponse` - SSE response wrapper
- **API**: ReadableStream/WritableStream Web APIs
- **Component**: Monaco Editor with live updates

## Data Flow
1. Input: Generation prompt and parameters
2. Transformations:
   - Prompt to AI provider format
   - Token stream to text chunks
   - SSE events to UI updates
   - Partial text to complete lines
3. Output: Progressive script content in editor

## Error Scenarios
- Network interruption mid-stream
- AI provider timeout
- Malformed SSE data
- Client disconnect
- Server memory pressure
- Invalid UTF-8 sequences
- Rate limit during stream

## Dependencies
- Vercel AI SDK
- Web Streams API
- Server-Sent Events
- TextDecoder for UTF-8
- AbortController for cancellation
- Monaco Editor API
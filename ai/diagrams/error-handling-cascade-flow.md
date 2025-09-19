# Error Handling Cascade Flow

## Overview
Comprehensive error handling flow showing how errors propagate through the application layers and how they're caught, logged, and presented to users.

## Trigger Points
- API request failures
- Database operation errors
- AI provider timeouts/failures
- Authentication errors
- Validation failures
- Network disconnections
- Rate limit violations

## Flow Diagram
```mermaid
graph TD
    A[Error Occurs] --> B{Error Source}

    %% API Layer Errors
    B -->|API Route| C[Route Error Handler]
    C --> D{Error Type}
    D -->|Auth Error| E[401/403 Response]
    D -->|Validation| F[400 Bad Request]
    D -->|Not Found| G[404 Not Found]
    D -->|Rate Limit| H[429 Too Many Requests]
    D -->|Database| I[Database Error Handler]
    D -->|Unknown| J[500 Internal Error]

    I --> K{Prisma Error}
    K -->|P2002| L[Unique Constraint]
    K -->|P2025| M[Record Not Found]
    K -->|P2003| N[Foreign Key Error]
    K -->|Connection| O[Connection Error]

    L --> P[Format User Message]
    M --> P
    N --> P
    O --> Q[Retry Logic]
    Q --> R{Retry Success?}
    R -->|Yes| S[Continue Flow]
    R -->|No| T[Log & Return Error]

    %% AI Generation Errors
    B -->|AI Provider| U[AI Error Handler]
    U --> V{Provider Error}
    V -->|Anthropic| W[Claude Error]
    V -->|Google| X[Gemini Error]
    V -->|OpenRouter| Y[OpenRouter Error]

    W --> Z{Error Code}
    Z -->|Rate Limit| AA[Switch Provider]
    Z -->|Invalid Key| AB[Log Critical]
    Z -->|Timeout| AC[Retry Once]
    Z -->|Content Filter| AD[User Message]

    AA --> AE[Try Next Provider]
    AE --> AF{Provider Available?}
    AF -->|Yes| AG[Use Fallback]
    AF -->|No| AH[All Providers Failed]

    %% State Machine Errors
    B -->|XState| AI[State Machine Error]
    AI --> AJ[Machine Error Handler]
    AJ --> AK[SET_ERROR Event]
    AK --> AL[Update Context]
    AL --> AM[Log State Error]
    AM --> AN[Show Error UI]

    %% Client-Side Errors
    B -->|React| AO[Error Boundary]
    AO --> AP{Caught?}
    AP -->|Yes| AQ[Fallback UI]
    AP -->|No| AR[Browser Console]

    AQ --> AS[Error Page]
    AS --> AT[Reset Button]
    AT --> AU[Clear State]

    %% Network Errors
    B -->|Network| AV[Network Error]
    AV --> AW{Type}
    AW -->|Timeout| AX[Show Timeout Message]
    AW -->|Offline| AY[Offline Indicator]
    AW -->|CORS| AZ[CORS Error Log]

    %% Toast Notifications
    P --> BA[Toast Notification]
    AD --> BA
    AH --> BA
    AN --> BA
    AX --> BA
    BA --> BB[User Sees Error]
    BB --> BC[Toast Auto-Dismiss]

    %% Logging Pipeline
    T --> BD[Error Logger]
    AB --> BD
    AM --> BD
    BD --> BE[Console Log]
    BE --> BF[Vercel Logs]
    BF --> BG[Error Tracking]

    %% User Recovery Actions
    BB --> BH{User Action}
    BH -->|Retry| BI[Retry Operation]
    BH -->|Cancel| BJ[Reset State]
    BH -->|Report| BK[Feedback Form]
    BH -->|Refresh| BL[Page Reload]

    %% Session Errors
    B -->|Session| BM[Session Error]
    BM --> BN{Expired?}
    BN -->|Yes| BO[Redirect to Login]
    BN -->|Invalid| BP[Clear Session]
    BP --> BO

    %% Usage Limit Errors
    B -->|Usage Limit| BQ[Limit Exceeded]
    BQ --> BR[Check User Type]
    BR --> BS{Is Sponsor?}
    BS -->|No| BT[Show Upgrade CTA]
    BS -->|Yes| BU[Show Extended Limit]
    BT --> BV[Link to Sponsor Page]
```

## Key Components
- **File**: `app/api/[...]/route.ts` - API error handlers
- **File**: `components/ScriptGenerationMachine.ts` - State machine error handling
- **File**: `lib/apiService.ts` - Client-side error handling
- **File**: `lib/ai-gateway.ts` - AI provider error handling
- **Function**: `handlePrismaError()` - Database error formatting
- **Function**: `logInteraction()` - Error logging
- **Component**: Error boundaries for React components
- **Library**: React Hot Toast for user notifications

## Data Flow
1. Input: Error object with stack trace
2. Transformations:
   - Error classification
   - User-friendly message generation
   - Logging with context
   - Recovery action determination
3. Output: User notification, logs, recovery options

## Error Scenarios
- **Authentication**: Expired sessions, invalid tokens
- **Authorization**: Insufficient permissions
- **Validation**: Invalid input data
- **Database**: Connection failures, constraint violations
- **AI Providers**: API limits, timeouts, content filters
- **Network**: Offline, timeouts, CORS issues
- **State Machine**: Invalid transitions, corrupted context
- **Rate Limiting**: Daily usage exceeded

## Dependencies
- Error boundaries (React 18+)
- Toast notification system
- Vercel logging infrastructure
- Prisma error types
- AI SDK error handling
- XState error events
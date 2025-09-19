# Interaction Logging and Analytics Flow

## Overview
Complete flow for logging user interactions, tracking analytics events, and generating insights from user behavior patterns.

## Trigger Points
- User actions (clicks, scrolls, inputs)
- State machine transitions
- API calls
- Error occurrences
- Generation completions
- Performance metrics

## Flow Diagram
```mermaid
graph TD
    A[User Interaction] --> B{Interaction Type}

    %% UI Interactions
    B -->|Click| C[Click Handler]
    B -->|Input| D[Input Handler]
    B -->|Scroll| E[Scroll Handler]
    B -->|Navigation| F[Route Handler]

    C --> G[Create Event Object]
    D --> G
    E --> G
    F --> G

    G --> H[Event Structure]
    H --> I[{
      timestamp: ISO string,
      sessionId: string,
      userId: string | null,
      action: string,
      component: string,
      details: object,
      metadata: object
    }]

    I --> J[logInteraction Function]
    J --> K[Batch Events]
    K --> L{Batch Size?}
    L -->|< 10| M[Add to Queue]
    L -->|>= 10| N[Send Batch]

    M --> O[Set Timer]
    O --> P[5 Second Delay]
    P --> Q{Timer Expired?}
    Q -->|Yes| N
    Q -->|No| R[Wait]

    N --> S[API: POST /api/log-interaction]

    %% Server Processing
    S --> T[Server Handler]
    T --> U[Validate Payload]
    U --> V{Valid?}
    V -->|No| W[400 Bad Request]
    V -->|Yes| X[Process Events]

    X --> Y[Extract Metrics]
    Y --> Z[{
      generationTime: number,
      promptLength: number,
      provider: string,
      success: boolean,
      errorType?: string
    }]

    Z --> AA[Store in Database]
    AA --> AB[prisma.interaction.createMany]
    AB --> AC[Async Write]

    %% State Machine Logging
    AD[State Transition] --> AE[Machine Logger]
    AE --> AF[Capture State]
    AF --> AG[{
      fromState: string,
      toState: string,
      event: string,
      context: object,
      duration: number
    }]
    AG --> J

    %% Performance Logging
    AH[Performance Metric] --> AI[Performance Observer]
    AI --> AJ{Metric Type}
    AJ -->|FCP| AK[First Contentful Paint]
    AJ -->|TTI| AL[Time to Interactive]
    AJ -->|CLS| AM[Cumulative Layout Shift]
    AJ -->|API| AN[API Response Time]

    AK --> AO[Collect Timing]
    AL --> AO
    AM --> AO
    AN --> AO
    AO --> AP[Add to Metrics]
    AP --> J

    %% Error Logging
    AQ[Error Occurs] --> AR[Error Boundary]
    AR --> AS[Capture Stack]
    AS --> AT[{
      error: message,
      stack: trace,
      component: string,
      props: object,
      userAgent: string
    }]
    AT --> AU[Critical Flag]
    AU --> AV{Is Critical?}
    AV -->|Yes| AW[Immediate Send]
    AV -->|No| M

    %% Analytics Aggregation
    AX[Analytics Pipeline] --> AY[Daily Aggregation]
    AY --> AZ[Query Interactions]
    AZ --> BA[Group by Type]
    BA --> BB[Calculate Metrics]

    BB --> BC[Usage Stats]
    BC --> BD[{
      dailyActiveUsers: number,
      totalGenerations: number,
      avgGenerationTime: number,
      topPrompts: string[],
      errorRate: percentage
    }]

    %% User Behavior Analysis
    BE[Behavior Analysis] --> BF[Session Reconstruction]
    BF --> BG[Order by Timestamp]
    BG --> BH[Build User Journey]
    BH --> BI[Identify Patterns]

    BI --> BJ[Common Paths]
    BJ --> BK[{
      path: string[],
      frequency: number,
      avgDuration: number,
      dropoffRate: percentage
    }]

    %% Real-time Dashboard
    BL[Dashboard Request] --> BM[Query Recent]
    BM --> BN[Last 24 Hours]
    BN --> BO[Aggregate Data]
    BO --> BP[WebSocket Push]
    BP --> BQ[Update Charts]

    %% Privacy Compliance
    BR[Data Collection] --> BS{Has Consent?}
    BS -->|No| BT[Anonymous Mode]
    BS -->|Yes| BU[Full Tracking]

    BT --> BV[Strip PII]
    BV --> BW[Hash IDs]
    BW --> BX[Store Safely]

    %% Export/Reporting
    BY[Generate Report] --> BZ[Select Date Range]
    BZ --> CA[Query Database]
    CA --> CB[Format Data]
    CB --> CC{Format Type}
    CC -->|CSV| CD[CSV Export]
    CC -->|JSON| CE[JSON Export]
    CC -->|PDF| CF[PDF Report]

    %% Retention Policy
    CG[Data Retention] --> CH[Scheduled Job]
    CH --> CI[Check Age]
    CI --> CJ{> 90 days?}
    CJ -->|Yes| CK[Archive/Delete]
    CJ -->|No| CL[Keep Active]
```

## Key Components
- **File**: `lib/interaction-logger.ts` - Client logging utilities
- **File**: `app/api/log-interaction/route.ts` - Logging endpoint
- **Model**: `prisma.interaction` - Interaction storage
- **Function**: `logInteraction()` - Event capture
- **Function**: `batchEvents()` - Batching logic
- **Observer**: Performance Observer API

## Data Flow
1. Input: User interaction events
2. Transformations:
   - Event standardization
   - Batching and queuing
   - Metric extraction
   - Aggregation
3. Output: Analytics insights

## Error Scenarios
- Network failure during batch send
- Invalid event format
- Database write failure
- Queue overflow
- Timer conflicts
- Missing session data

## Dependencies
- Performance Observer API
- Web Workers for background processing
- PostgreSQL for storage
- WebSocket for real-time updates
- Batch processing queue
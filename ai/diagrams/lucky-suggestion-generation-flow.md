# Lucky and Suggestion Generation Flow

## Overview
Flow for generating random "I'm Feeling Lucky" scripts and AI-powered suggestions based on user context and popular scripts.

## Trigger Points
- "I'm Feeling Lucky" button click
- Suggestion carousel initialization
- Next suggestions request
- Suggestion item click

## Flow Diagram
```mermaid
graph TD
    A[User Action] --> B{Action Type}

    %% Lucky Generation Flow
    B -->|Lucky Button| C[Lucky Button Click]
    C --> D[Dispatch Lucky Request]
    D --> E[API: GET /api/lucky]

    E --> F[Server Handler]
    F --> G[Select Random Category]
    G --> H{Category Type}

    H -->|Productivity| I[Productivity Templates]
    H -->|Developer| J[Developer Tools]
    H -->|System| K[System Automation]
    H -->|Fun| L[Fun Scripts]
    H -->|Data| M[Data Processing]

    I --> N[Random Template]
    J --> N
    K --> N
    L --> N
    M --> N

    N --> O[Generate Context]
    O --> P[Create Prompt]
    P --> Q[{
      category: string,
      action: string,
      tool: string,
      description: string
    }]

    Q --> R[Build Full Prompt]
    R --> S[Return Lucky Prompt]
    S --> T[Client Receives]
    T --> U[Set Lucky Request ID]
    U --> V[Update State Machine]
    V --> W[Trigger Generation]

    %% Suggestions Flow
    B -->|Load Suggestions| X[Component Mount]
    X --> Y[API: GET /api/next-suggestions]

    Y --> Z[Server Handler]
    Z --> AA{Has Context?}
    AA -->|User History| AB[Analyze Past Scripts]
    AA -->|Popular| AC[Get Trending Scripts]
    AA -->|Category| AD[Category-based]
    AA -->|Random| AE[Random Selection]

    AB --> AF[Extract Patterns]
    AF --> AG[Generate Related]

    AC --> AH[Query Popular]
    AH --> AI[Last 7 Days]
    AI --> AJ[Sort by Stars]

    AD --> AK[Filter by Category]
    AE --> AL[Random Sample]

    AG --> AM[AI Generation]
    AJ --> AM
    AK --> AM
    AL --> AM

    AM --> AN[GPT/Claude API]
    AN --> AO[Generate Suggestions]
    AO --> AP[{
      title: string,
      description: string,
      prompt: string,
      icon: emoji
    }[]]

    AP --> AQ[Return Suggestions]
    AQ --> AR[Client Cache]

    %% Suggestion Interaction
    AS[Suggestion Card] --> AT{User Action}
    AT -->|Click| AU[Select Suggestion]
    AU --> AV[Extract Prompt]
    AV --> AW[Dispatch FROM_SUGGESTION]
    AW --> AX[Set Suggestion Flag]
    AX --> AY[Update Prompt]
    AY --> AZ[Auto-Generate]

    AT -->|Hover| BA[Show Preview]
    BA --> BB[Display Tooltip]

    %% Carousel Navigation
    BC[Carousel Component] --> BD[Show 3-5 Items]
    BD --> BE{Navigation}
    BE -->|Next| BF[Slide Right]
    BE -->|Previous| BG[Slide Left]
    BE -->|Dots| BH[Jump to Index]

    BF --> BI[Load More Check]
    BI --> BJ{Need More?}
    BJ -->|Yes| BK[Fetch Next Batch]
    BJ -->|No| BL[Show Existing]

    %% Smart Suggestions
    BM[Context Analysis] --> BN[User Behavior]
    BN --> BO[Track Patterns]
    BO --> BP[{
      timeOfDay: morning/afternoon/evening,
      frequency: Map<category, count>,
      lastUsed: Date,
      preferences: string[]
    }]

    BP --> BQ[ML Model Input]
    BQ --> BR[Predict Interests]
    BR --> BS[Personalized Suggestions]

    %% Prompt Enhancement
    BT[Selected Suggestion] --> BU[Base Prompt]
    BU --> BV[Add Context]
    BV --> BW[{
      time: current time,
      platform: OS type,
      recentTools: used APIs
    }]
    BW --> BX[Enhanced Prompt]

    %% Cache Management
    BY[Suggestion Cache] --> BZ{Cache Valid?}
    BZ -->|< 5 min| CA[Use Cached]
    BZ -->|> 5 min| CB[Refresh]
    CA --> CC[Instant Display]
    CB --> CD[Background Update]

    %% Error Fallbacks
    CE[API Error] --> CF{Error Type}
    CF -->|Network| CG[Use Static List]
    CF -->|AI Error| CH[Use Templates]
    CF -->|No Data| CI[Default Suggestions]

    CG --> CJ[Hardcoded Options]
    CH --> CJ
    CI --> CJ
```

## Key Components
- **File**: `app/api/lucky/route.ts` - Lucky generation endpoint
- **File**: `app/api/next-suggestions/route.ts` - Suggestions endpoint
- **File**: `components/ScriptSuggestions.tsx` - Carousel UI
- **File**: `app/api/lucky/prompt.ts` - Template library
- **Function**: `generateLuckyPrompt()` - Random prompt creation
- **Function**: `getNextSuggestions()` - AI suggestion generation

## Data Flow
1. Input: User context, history, preferences
2. Transformations:
   - Category selection
   - Template randomization
   - AI prompt generation
   - Context enhancement
3. Output: Ready-to-use prompts

## Error Scenarios
- AI API failure
- Empty suggestion response
- Invalid prompt format
- Cache corruption
- Rate limit on suggestions
- Template loading failure

## Dependencies
- AI providers (GPT/Claude)
- Template database
- User analytics data
- Cache storage
- Random number generation
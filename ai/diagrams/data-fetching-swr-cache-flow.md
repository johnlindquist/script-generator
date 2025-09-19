# Data Fetching and SWR Cache Flow

## Overview
Complete data fetching flow using SWR for client-side caching, revalidation, and optimistic updates with React Server Components.

## Trigger Points
- Component mount requiring data
- User interaction triggering refetch
- Focus/reconnect revalidation
- Mutation with optimistic update
- Background refresh interval

## Flow Diagram
```mermaid
graph TD
    A[Component Render] --> B{Data Source}

    %% Server Component Flow
    B -->|Server Component| C[Direct Database Query]
    C --> D[Prisma Query]
    D --> E[Await Result]
    E --> F[Pass as Props]
    F --> G[Render HTML]

    %% Client Component Flow
    B -->|Client Component| H[useSWR Hook]
    H --> I[Generate Cache Key]
    I --> J{Check Cache}

    J -->|Hit| K[Return Cached Data]
    J -->|Miss| L[Fetch Data]
    J -->|Stale| M[Return Stale + Revalidate]

    K --> N[Render with Data]
    L --> O[API Fetcher Function]
    M --> P[Show Stale Data]
    P --> Q[Background Fetch]

    %% Fetcher Flow
    O --> R[Build Request]
    R --> S[Add Auth Headers]
    S --> T[Fetch API Endpoint]
    T --> U{Response Status}

    U -->|200| V[Parse JSON]
    U -->|401| W[Redirect to Login]
    U -->|Error| X[Throw Error]

    V --> Y[Update Cache]
    Y --> Z[Trigger Re-render]

    %% Mutation Flow
    AA[User Action] --> AB[Mutate Function]
    AB --> AC{Optimistic?}
    AC -->|Yes| AD[Update Cache Optimistically]
    AC -->|No| AE[Show Loading]

    AD --> AF[Update UI Immediately]
    AF --> AG[Send API Request]
    AG --> AH{Success?}

    AH -->|Yes| AI[Confirm Update]
    AH -->|No| AJ[Rollback Cache]
    AJ --> AK[Show Error]

    %% Revalidation Triggers
    AL[Window Focus] --> AM[Check Revalidate on Focus]
    AM -->|Enabled| AN[Trigger Revalidation]

    AO[Network Reconnect] --> AP[Check Revalidate on Reconnect]
    AP -->|Enabled| AN

    AQ[Interval Timer] --> AR[Check Refresh Interval]
    AR -->|Set| AN

    AN --> AS[Fetch Fresh Data]
    AS --> AT[Compare with Cache]
    AT --> AU{Changed?}
    AU -->|Yes| AV[Update Cache & UI]
    AU -->|No| AW[Keep Current]

    %% Global Mutate
    AX[Global Mutation] --> AY[mutate(key)]
    AY --> AZ[Find All Matching Keys]
    AZ --> BA[Revalidate Each]
    BA --> BB[Update All Components]

    %% Infinite Loading
    BC[useSWRInfinite] --> BD[Initial Page]
    BD --> BE[Load Page 0]
    BE --> BF[User Scrolls]
    BF --> BG[Trigger Next Page]
    BG --> BH[getKey Function]
    BH --> BI[Generate Page Key]
    BI --> BJ[Fetch Page N]
    BJ --> BK[Append to Data Array]
    BK --> BL[Update UI]

    %% Error Handling
    X --> BM[onError Callback]
    BM --> BN{Retry?}
    BN -->|Yes| BO[Exponential Backoff]
    BN -->|No| BP[Show Error State]
    BO --> BQ[Wait Delay]
    BQ --> BR[Retry Fetch]

    %% Cache Strategies
    BS[SWR Config] --> BT{Strategy}
    BT -->|Cache First| BU[Serve from Cache]
    BT -->|Network First| BV[Always Fetch]
    BT -->|Cache Only| BW[Never Revalidate]
    BT -->|Network Only| BX[No Cache]

    %% Deduplication
    BY[Multiple Components] --> BZ[Same Cache Key]
    BZ --> CA[Deduplicate Requests]
    CA --> CB[Single Fetch]
    CB --> CC[Broadcast to All]

    %% Prefetching
    CD[Link Hover] --> CE[Prefetch Data]
    CE --> CF[mutate(key, data)]
    CF --> CG[Populate Cache]
    CG --> CH[Instant Navigation]

    %% Persistence
    CI[Local Storage] --> CJ[Persist Cache]
    CJ --> CK[Page Reload]
    CK --> CL[Restore Cache]
    CL --> CM[Hydrate SWR]
```

## Key Components
- **Hook**: `useSWR()` - Data fetching with cache
- **Hook**: `useSWRInfinite()` - Pagination/infinite scroll
- **Function**: `mutate()` - Cache updates
- **Function**: `fetcher()` - Data fetch function
- **Config**: SWR global configuration
- **Cache**: In-memory cache with deduplication

## Data Flow
1. Input: Cache key and fetcher function
2. Transformations:
   - Cache lookup
   - Network request
   - Response parsing
   - Cache update
   - Optimistic updates
3. Output: Data, error, loading states

## Error Scenarios
- Network request failure
- Invalid cache key
- Stale data conflicts
- Optimistic update rollback
- Race conditions
- Memory leaks from subscriptions

## Dependencies
- SWR library
- Fetch API or axios
- React 18+ with Suspense
- Server Components
- Cache provider
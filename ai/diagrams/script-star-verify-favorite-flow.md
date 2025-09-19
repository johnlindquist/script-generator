# Script Star, Verify, and Favorite Flow

## Overview
Complete flow for user interactions with scripts including starring, verification badges, and favoriting, with optimistic updates and database persistence.

## Trigger Points
- Star button click
- Verify button click
- Favorite button click
- Bulk actions
- Undo actions

## Flow Diagram
```mermaid
graph TD
    A[User Interaction] --> B{Action Type}

    %% Star Flow
    B -->|Star| C[Star Button Click]
    C --> D[Check Auth]
    D --> E{Authenticated?}
    E -->|No| F[Show Login Prompt]
    E -->|Yes| G[Optimistic Update]

    G --> H[Toggle Star UI]
    H --> I[API: POST /api/star]
    I --> J[Server Handler]
    J --> K[Get Script ID]
    K --> L[prisma.script.update]
    L --> M[Toggle starred Field]
    M --> N{Success?}
    N -->|Yes| O[Confirm UI]
    N -->|No| P[Revert UI]

    %% Verify Flow
    B -->|Verify| Q[Verify Button Click]
    Q --> R[Check Auth]
    R --> S{Authenticated?}
    S -->|No| T[Show Login Modal]
    S -->|Yes| U[Check Existing]

    U --> V[API: GET Verification Status]
    V --> W{Already Verified?}
    W -->|Yes| X[Remove Verification]
    W -->|No| Y[Add Verification]

    X --> Z[API: POST /api/verify]
    Y --> Z
    Z --> AA[Server Handler]
    AA --> AB{Action}
    AB -->|Add| AC[prisma.verification.create]
    AB -->|Remove| AD[prisma.verification.delete]

    AC --> AE[{
      userId: string,
      scriptId: string,
      createdAt: Date,
      reason?: string
    }]
    AD --> AF[Delete Record]

    AE --> AG[Update Count]
    AF --> AG
    AG --> AH[Update UI Badge]

    %% Favorite Flow
    B -->|Favorite| AI[Favorite Button Click]
    AI --> AJ[FavoriteButtonClient]
    AJ --> AK{Authenticated?}
    AK -->|No| AL[Redirect to Login]
    AK -->|Yes| AM[Optimistic Toggle]

    AM --> AN[Update Heart Icon]
    AN --> AO[API: POST /api/favorite]
    AO --> AP[Server Handler]
    AP --> AQ[Check Existing]
    AQ --> AR{Exists?}

    AR -->|Yes| AS[prisma.favorite.delete]
    AR -->|No| AT[prisma.favorite.create]

    AS --> AU[Remove from List]
    AT --> AV[Add to List]
    AU --> AW[Update Response]
    AV --> AW

    AW --> AX{Success?}
    AX -->|Yes| AY[Keep UI State]
    AX -->|No| AZ[Revert & Error]

    %% Bulk Actions
    BA[Select Multiple] --> BB[Show Bulk Actions]
    BB --> BC{Bulk Action}
    BC -->|Star All| BD[Batch Star API]
    BC -->|Favorite All| BE[Batch Favorite API]
    BC -->|Verify All| BF[Batch Verify API]

    BD --> BG[prisma.$transaction]
    BE --> BG
    BF --> BG
    BG --> BH[Atomic Updates]
    BH --> BI[Update All UIs]

    %% Count Updates
    BJ[Action Complete] --> BK{Update Type}
    BK -->|Star| BL[script.starCount++]
    BK -->|Verify| BM[script.verifyCount++]
    BK -->|Favorite| BN[script.favoriteCount++]

    BL --> BO[Real-time Update]
    BM --> BO
    BN --> BO
    BO --> BP[Broadcast to Clients]

    %% Undo Actions
    BQ[Undo Request] --> BR[Show Undo Toast]
    BR --> BS[5 Second Timer]
    BS --> BT{Undo Clicked?}
    BT -->|Yes| BU[Reverse Action]
    BT -->|No| BV[Confirm Action]

    BU --> BW[API: Reverse Call]
    BW --> BX[Restore State]

    %% Lock Protection
    BY[Check Lock Status] --> BZ{Script Locked?}
    BZ -->|Yes| CA[Check Threshold]
    CA --> CB{Many Stars?}
    CB -->|Yes| CC[Prevent Unstar]
    CB -->|No| CD[Allow Action]

    %% Animation Flow
    CE[Star Animation] --> CF[Framer Motion]
    CF --> CG[Scale Transform]
    CG --> CH[Color Transition]
    CH --> CI[Particle Effect]
    CI --> CJ[Complete]

    %% Notification
    CK[Action Success] --> CL{Notify Owner?}
    CL -->|Star| CM[Send Star Notification]
    CL -->|Verify| CN[Send Verify Badge]
    CL -->|Favorite| CO[No Notification]

    CM --> CP[Email/In-App]
    CN --> CP

    %% Analytics
    CQ[Track Interaction] --> CR[Log Event]
    CR --> CS[{
      action: star|verify|favorite,
      scriptId: string,
      userId: string,
      timestamp: Date,
      context: object
    }]
    CS --> CT[Analytics Pipeline]

    %% Cache Invalidation
    CU[Action Complete] --> CV[Invalidate Cache]
    CV --> CW[SWR Mutate]
    CW --> CX[Refetch Data]
    CX --> CY[Update All Views]
```

## Key Components
- **File**: `components/FavoriteButtonClient.tsx` - Favorite UI
- **File**: `app/api/star/route.ts` - Star endpoint
- **File**: `app/api/verify/route.ts` - Verification endpoint
- **File**: `app/api/favorite/route.ts` - Favorite endpoint
- **Model**: `prisma.favorite` - Favorite records
- **Model**: `prisma.verification` - Verification records

## Data Flow
1. Input: User interaction (click)
2. Transformations:
   - Authentication check
   - Optimistic UI update
   - Database transaction
   - Count aggregation
3. Output: Updated UI and persisted state

## Error Scenarios
- Unauthenticated action attempt
- Network failure during update
- Optimistic update rollback
- Concurrent action conflicts
- Database constraint violations
- Animation interruption

## Dependencies
- Prisma transactions
- Optimistic UI patterns
- Framer Motion animations
- SWR cache invalidation
- Real-time updates (optional WebSocket)
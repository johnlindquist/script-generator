# Usage Tracking and Rate Limiting Flow

## Overview
Flow for tracking daily usage limits, differentiating between regular users and sponsors, and enforcing generation quotas.

## Trigger Points
- Script generation request initiated
- Usage check on page load
- Daily reset at midnight UTC
- Sponsor status verification

## Flow Diagram
```mermaid
graph TD
    A[Generation Request] --> B[Check Authentication]
    B --> C{Authenticated?}
    C -->|No| D[Anonymous Limit: 0]
    C -->|Yes| E[Get User ID]

    E --> F[API: /api/usage]
    F --> G[Query Usage Table]
    G --> H[Get Today's Date]
    H --> I[prisma.usage.findUnique]

    I --> J{Record Exists?}
    J -->|No| K[Create Usage Record]
    J -->|Yes| L[Get Current Count]

    K --> M[Set Count = 0]
    M --> N[Check Sponsor Status]
    L --> N

    N --> O[prisma.githubSponsor.findUnique]
    O --> P{Is Sponsor?}

    P -->|Yes| Q[Set Limit = 100]
    P -->|No| R[Set Limit = 24]

    Q --> S[Calculate Remaining]
    R --> S
    S --> T{count < limit?}

    T -->|Yes| U[Allow Generation]
    T -->|No| V[Block Generation]

    U --> W[Proceed with Generation]
    W --> X[Generation Complete]
    X --> Y[Increment Usage]
    Y --> Z[prisma.usage.upsert]
    Z --> AA[Update count++]

    V --> AB[Show Limit Message]
    AB --> AC{Is Sponsor?}
    AC -->|No| AD[Show Sponsor CTA]
    AC -->|Yes| AE[Show Extended Limit]
    AD --> AF[Link to GitHub Sponsors]

    %% Daily Reset Flow
    AG[Cron Job / Timer] --> AH[Midnight UTC]
    AH --> AI[Reset Trigger]
    AI --> AJ[Clear Old Records]
    AJ --> AK[prisma.usage.deleteMany]
    AK --> AL[where date < today]

    %% Check Sponsor Flow
    AM[Check Sponsor Status] --> AN[API: /api/check-sponsor]
    AN --> AO[GitHub GraphQL Query]
    AO --> AP{Active Sponsor?}
    AP -->|Yes| AQ[Update Database]
    AP -->|No| AR[Remove Sponsor Status]
    AQ --> AS[prisma.githubSponsor.upsert]
    AR --> AT[prisma.githubSponsor.delete]

    %% Usage Display Flow
    AU[Page Load] --> AV[Fetch Usage Stats]
    AV --> F
    AW[Display Counter] --> AX[Show {used}/{limit}]
    AX --> AY[Update Progress Bar]
    AY --> AZ{Near Limit?}
    AZ -->|Yes| BA[Show Warning]
    AZ -->|No| BB[Normal Display]

    %% Sponsor Verification Flow
    BC[Login Event] --> BD[Check Sponsor on Auth]
    BD --> BE[Store in Session]
    BE --> BF[Cache for 12 hours]

    %% API Response
    BG[Usage Response] --> BH{Format Response}
    BH --> BI[JSON Response]
    BI --> BJ[{
      count: number,
      limit: number,
      remaining: number,
      isSponsor: boolean,
      resetAt: Date
    }]
```

## Key Components
- **File**: `app/api/usage/route.ts` - Usage tracking endpoint
- **File**: `app/api/check-sponsor/route.ts` - Sponsor verification
- **Model**: `prisma.usage` - Daily usage records
- **Model**: `prisma.githubSponsor` - Sponsor status
- **Function**: `checkUserSponsorStatus()` - GitHub API verification
- **Constants**: Regular limit (24), Sponsor limit (100)

## Data Flow
1. Input: User ID from session
2. Transformations:
   - Date normalization to UTC day
   - Usage count aggregation
   - Sponsor status check
   - Limit calculation
3. Output: Usage stats with remaining quota

## Error Scenarios
- Database connection failure
- GitHub API rate limit
- Invalid session/user ID
- Sponsor API timeout
- Clock skew issues
- Concurrent usage updates

## Dependencies
- PostgreSQL with date functions
- GitHub Sponsors GraphQL API
- NextAuth session management
- Prisma ORM with upsert
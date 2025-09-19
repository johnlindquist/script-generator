# GitHub Sponsor Verification and Benefits Flow

## Overview
Complete flow for verifying GitHub sponsors, unlocking benefits, and managing sponsor-exclusive features including increased generation limits.

## Trigger Points
- User login/authentication
- Manual sponsor check
- Daily limit check
- Sponsor webhook events
- Benefit activation

## Flow Diagram
```mermaid
graph TD
    A[User Login] --> B[Auth Callback]
    B --> C[Get GitHub Profile]
    C --> D[Extract Username]
    D --> E[Check Sponsor Status]

    E --> F[checkUserSponsorStatus]
    F --> G[GitHub GraphQL API]
    G --> H[Build Query]
    H --> I[`query {
      user(login: SPONSOR_LOGIN) {
        sponsorshipsAsMaintainer(
          filter: {sponsor: username}
        ) {
          nodes {
            sponsorEntity { login, id }
            tier { isOneTime }
          }
        }
      }
    }`]

    I --> J[Execute Query]
    J --> K{Response}
    K -->|Error| L[API Error]
    K -->|Success| M[Parse Response]

    L --> N[Log Error]
    N --> O[Default Non-Sponsor]

    M --> P{Has Sponsorship?}
    P -->|No| Q[Not a Sponsor]
    P -->|Yes| R{Is One-Time?}
    R -->|Yes| S[Ignore One-Time]
    R -->|No| T[Active Sponsor]

    T --> U[Update Database]
    U --> V[prisma.githubSponsor.upsert]
    V --> W[{
      login: string,
      nodeId: string,
      databaseId: number,
      userId: string,
      tier: string,
      since: Date
    }]

    %% Benefits Activation
    W --> X[Activate Benefits]
    X --> Y{Benefit Type}
    Y -->|Generation Limit| Z[Set Limit = 100]
    Y -->|Priority Queue| AA[Enable Priority]
    Y -->|Exclusive Features| AB[Unlock Features]
    Y -->|No Ads| AC[Disable Ads]

    Z --> AD[Update Session]
    AA --> AD
    AB --> AD
    AC --> AD
    AD --> AE[Set isSponsor = true]

    %% Manual Check Flow
    AF[Check Sponsor Button] --> AG[API: GET /api/check-sponsor]
    AG --> AH[Get Session]
    AH --> AI{Authenticated?}
    AI -->|No| AJ[401 Error]
    AI -->|Yes| AK[Get Username]
    AK --> F

    %% Webhook Flow
    AL[GitHub Webhook] --> AM[Sponsor Event]
    AM --> AN{Event Type}
    AN -->|created| AO[New Sponsor]
    AN -->|cancelled| AP[Cancel Sponsor]
    AN -->|tier_changed| AQ[Update Tier]

    AO --> AR[Add Sponsor]
    AP --> AS[Remove Sponsor]
    AQ --> AT[Update Benefits]

    AR --> AU[Send Welcome Email]
    AS --> AV[Send Cancellation]
    AT --> AW[Notify Tier Change]

    %% Batch Sync
    AX[Daily Sync] --> AY[API: GET /api/get-all-sponsors]
    AY --> AZ[Fetch All Sponsors]
    AZ --> BA[GitHub GraphQL]
    BA --> BB[Paginated Query]
    BB --> BC[Process Batch]

    BC --> BD[For Each Sponsor]
    BD --> BE[Update/Create Record]
    BE --> BF[Next Sponsor]
    BF --> BD
    BF --> BG[Sync Complete]

    %% Usage Limit Check
    BH[Generation Request] --> BI[Check Usage]
    BI --> BJ[Get User Status]
    BJ --> BK{Is Sponsor?}
    BK -->|Yes| BL[Limit = 100]
    BK -->|No| BM[Limit = 24]

    BL --> BN[Check Count]
    BM --> BN
    BN --> BO{Within Limit?}
    BO -->|Yes| BP[Allow Generation]
    BO -->|No| BQ[Show Limit Error]

    BQ --> BR{Is Sponsor?}
    BR -->|No| BS[Show Sponsor CTA]
    BR -->|Yes| BT[Show Extended Limit]

    BS --> BU[Link to GitHub Sponsors]
    BU --> BV[Sponsor Page]
    BV --> BW[{
      url: github.com/sponsors/USERNAME,
      tiers: [
        {$5: 100 generations},
        {$10: Priority support},
        {$25: Custom features}
      ]
    }]

    %% Cache Management
    BX[Sponsor Cache] --> BY[Redis/Memory]
    BY --> BZ{Cache Hit?}
    BZ -->|Yes| CA[Return Cached]
    BZ -->|No| CB[Fetch Fresh]
    CA --> CC[TTL: 1 hour]
    CB --> CD[Update Cache]

    %% Tier Benefits
    CE[Tier Check] --> CF{Tier Level}
    CF -->|$5| CG[Basic Benefits]
    CF -->|$10| CH[Pro Benefits]
    CF -->|$25| CI[Premium Benefits]

    CG --> CJ[100 daily generations]
    CH --> CK[+ Priority queue]
    CI --> CL[+ Custom prompts]

    %% Expiration Handling
    CM[Check Expiration] --> CN{Still Active?}
    CN -->|No| CO[Remove Benefits]
    CN -->|Yes| CP[Keep Active]
    CO --> CQ[Reset to Default]
    CQ --> CR[Notify User]
```

## Key Components
- **File**: `app/api/check-sponsor/route.ts` - Manual sponsor check
- **File**: `app/api/get-all-sponsors/route.ts` - Batch sync endpoint
- **Function**: `checkUserSponsorStatus()` - GraphQL verification
- **Model**: `prisma.githubSponsor` - Sponsor records
- **API**: GitHub GraphQL API for sponsor data
- **Config**: Sponsor benefits configuration

## Data Flow
1. Input: GitHub username
2. Transformations:
   - GraphQL query construction
   - Sponsorship verification
   - Tier determination
   - Benefits activation
3. Output: Sponsor status and benefits

## Error Scenarios
- GitHub API rate limiting
- Invalid GraphQL token
- Network timeout
- Webhook signature failure
- Cache inconsistency
- Tier change conflicts

## Dependencies
- GitHub Sponsors API
- GraphQL client
- Webhook receiver
- Cache layer (Redis/Memory)
- Email service for notifications
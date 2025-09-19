# Database CRUD Operations Flow

## Overview
Complete database operations flow using Prisma ORM with PostgreSQL, covering all CRUD operations for scripts, users, and related entities.

## Trigger Points
- User authentication creates/updates user records
- Script generation creates script records
- User interactions (favorite, star, install, verify)
- Usage tracking on generation
- Script forking and versioning

## Flow Diagram
```mermaid
graph TD
    A[Client Request] --> B[API Route Handler]
    B --> C{Operation Type}

    %% User Operations
    C -->|User Auth| D[User CRUD]
    D --> E[prisma.user.upsert]
    E --> F{Exists?}
    F -->|Yes| G[Update User]
    F -->|No| H[Create User]
    G --> I[Return User]
    H --> I

    %% Script Operations
    C -->|Script Save| J[Script Create]
    J --> K[Generate UUID]
    K --> L[prisma.script.create]
    L --> M[Set Relations]
    M --> N[Create Version]
    N --> O[prisma.scriptVersion.create]
    O --> P[Return Script]

    C -->|Script Update| Q[Script Update]
    Q --> R{Check Owner}
    R -->|Valid| S[prisma.script.update]
    R -->|Invalid| T[403 Forbidden]
    S --> U[Create New Version]
    U --> O

    C -->|Script Delete| V[Script Delete]
    V --> W{Check Owner}
    W -->|Valid| X[prisma.script.delete]
    W -->|Invalid| T
    X --> Y[Cascade Delete Relations]

    %% Interaction Operations
    C -->|Favorite| Z[Toggle Favorite]
    Z --> AA{Check Existing}
    AA -->|Exists| AB[prisma.favorite.delete]
    AA -->|None| AC[prisma.favorite.create]
    AB --> AD[Update Count]
    AC --> AD

    C -->|Star| AE[Toggle Star]
    AE --> AF[prisma.script.update]
    AF --> AG[Toggle starred field]

    C -->|Install| AH[Track Install]
    AH --> AI[prisma.install.upsert]
    AI --> AJ[Update Install Count]

    C -->|Verify| AK[Toggle Verification]
    AK --> AL{Check Existing}
    AL -->|Exists| AM[prisma.verification.delete]
    AL -->|None| AN[prisma.verification.create]

    %% Usage Tracking
    C -->|Usage| AO[Track Usage]
    AO --> AP[Get Today's Date]
    AP --> AQ[prisma.usage.upsert]
    AQ --> AR{Today's Record?}
    AR -->|Yes| AS[Increment Count]
    AR -->|No| AT[Create New Record]
    AS --> AU[Return Usage]
    AT --> AU

    %% Search Operations
    C -->|Search| AV[Search Scripts]
    AV --> AW[Build Query]
    AW --> AX[Trigram Index Search]
    AX --> AY[prisma.$queryRaw]
    AY --> AZ[Return Results]

    %% Fork Operations
    C -->|Fork| BA[Fork Script]
    BA --> BB[Get Parent Script]
    BB --> BC[prisma.script.create]
    BC --> BD[Set parentId]
    BD --> BE[Copy Content]
    BE --> BF[Return Forked Script]

    %% Sponsor Check
    C -->|Check Sponsor| BG[Verify Sponsor]
    BG --> BH[prisma.githubSponsor.findUnique]
    BH --> BI{Found?}
    BI -->|Yes| BJ[Return Sponsor Data]
    BI -->|No| BK[Check GitHub API]
    BK --> BL{Is Sponsor?}
    BL -->|Yes| BM[prisma.githubSponsor.create]
    BL -->|No| BN[Return Non-Sponsor]
    BM --> BJ

    %% Transaction Example
    BO[Complex Operation] --> BP[prisma.$transaction]
    BP --> BQ[Multiple Operations]
    BQ --> BR{All Success?}
    BR -->|Yes| BS[Commit]
    BR -->|No| BT[Rollback]
```

## Key Components
- **File**: `lib/prisma.ts` - Prisma client singleton
- **File**: `prisma/schema.prisma` - Database schema
- **Models**: User, Script, ScriptVersion, Favorite, Install, Verification, Usage, GithubSponsor
- **Indexes**: Trigram index on script content for search
- **Relations**: One-to-many, many-to-many relationships

## Data Flow
1. Input: API request with operation parameters
2. Transformations:
   - Request validation
   - Authorization checks
   - Database query construction
   - Relation management
3. Output: Database response or error

## Error Scenarios
- Unique constraint violations
- Foreign key constraint failures
- Connection pool exhaustion
- Transaction rollbacks
- Authorization failures
- Database connection timeouts

## Dependencies
- PostgreSQL (Neon hosted)
- Prisma ORM
- Connection pooling via Neon
- Database migrations
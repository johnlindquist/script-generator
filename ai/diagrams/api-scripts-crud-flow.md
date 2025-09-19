# Scripts API CRUD Flow

## Overview
Complete RESTful API flow for script management including create, read, update, and delete operations with authentication and authorization.

## Trigger Points
- GET /api/scripts - List scripts
- POST /api/scripts - Create script
- GET /api/scripts/[id] - Get single script
- PATCH /api/scripts/[id] - Update script
- DELETE /api/scripts/[id] - Delete script
- GET /api/scripts/[id]/raw - Get raw script content

## Flow Diagram
```mermaid
graph TD
    A[Client Request] --> B[Next.js Route Handler]
    B --> C{HTTP Method}

    %% GET List Scripts
    C -->|GET /api/scripts| D[List Scripts Handler]
    D --> E[Parse Query Params]
    E --> F{Filter Type}
    F -->|mine| G[Get Session]
    G --> H{Authenticated?}
    H -->|Yes| I[Query User Scripts]
    H -->|No| J[401 Unauthorized]
    I --> K[prisma.script.findMany]

    F -->|all| L[Query All Scripts]
    L --> K
    F -->|search| M[Parse Search Query]
    M --> N[Trigram Search]
    N --> K

    K --> O[Include Relations]
    O --> P[Format Response]
    P --> Q[200 OK + Scripts]

    %% POST Create Script
    C -->|POST /api/scripts| R[Create Script Handler]
    R --> S[Get Session]
    S --> T{Authenticated?}
    T -->|No| J
    T -->|Yes| U[Validate Body]
    U --> V{Valid?}
    V -->|No| W[400 Bad Request]
    V -->|Yes| X[Generate Script ID]
    X --> Y[prisma.script.create]
    Y --> Z[Create Initial Version]
    Z --> AA[Log Creation]
    AA --> AB[201 Created + Script]

    %% GET Single Script
    C -->|GET /api/scripts/[id]| AC[Get Script Handler]
    AC --> AD[Extract Script ID]
    AD --> AE[prisma.script.findUnique]
    AE --> AF{Found?}
    AF -->|No| AG[404 Not Found]
    AF -->|Yes| AH[Include Owner & Stats]
    AH --> AI[Check Visibility]
    AI --> AJ{Public or Owner?}
    AJ -->|No| AK[403 Forbidden]
    AJ -->|Yes| AL[200 OK + Script]

    %% PATCH Update Script
    C -->|PATCH /api/scripts/[id]| AM[Update Script Handler]
    AM --> AN[Get Session]
    AN --> AO{Authenticated?}
    AO -->|No| J
    AO -->|Yes| AP[Extract Script ID]
    AP --> AQ[Get Script]
    AQ --> AR{Check Owner}
    AR -->|Not Owner| AS[403 Forbidden]
    AR -->|Is Owner| AT{Script Locked?}
    AT -->|Yes| AU[423 Locked]
    AT -->|No| AV[Validate Updates]
    AV --> AW[prisma.script.update]
    AW --> AX[Create Version Snapshot]
    AX --> AY[200 OK + Updated]

    %% DELETE Script
    C -->|DELETE /api/scripts/[id]| AZ[Delete Script Handler]
    AZ --> BA[Get Session]
    BA --> BB{Authenticated?}
    BB -->|No| J
    BB -->|Yes| BC[Extract Script ID]
    BC --> BD[Get Script]
    BD --> BE{Check Owner}
    BE -->|Not Owner| BF[403 Forbidden]
    BE -->|Is Owner| BG{Has Interactions?}
    BG -->|Many| BH[Prevent Delete]
    BG -->|Few| BI[prisma.script.delete]
    BH --> BJ[423 Locked]
    BI --> BK[Cascade Delete]
    BK --> BL[204 No Content]

    %% GET Raw Content
    C -->|GET /api/scripts/[id]/raw| BM[Raw Content Handler]
    BM --> BN[Extract Script ID]
    BN --> BO[Get Script Content]
    BO --> BP{Found?}
    BP -->|No| BQ[404 Not Found]
    BP -->|Yes| BR[Set Headers]
    BR --> BS[Content-Type: text/plain]
    BS --> BT[200 OK + Raw Script]

    %% Error Handling
    BU[Error Boundary] --> BV{Error Type}
    BV -->|Prisma| BW[Database Error]
    BV -->|Validation| BX[Validation Error]
    BV -->|Auth| BY[Auth Error]
    BV -->|Unknown| BZ[500 Internal Error]
```

## Key Components
- **File**: `app/api/scripts/route.ts` - List and create scripts
- **File**: `app/api/scripts/[scriptId]/route.ts` - Single script operations
- **File**: `app/api/scripts/[scriptId]/raw/route.ts` - Raw content endpoint
- **Function**: `getServerSession()` - Authentication check
- **Function**: `prisma.script.*` - Database operations
- **Middleware**: NextAuth session validation

## Data Flow
1. Input: HTTP request with headers, params, body
2. Transformations:
   - Session extraction from cookies
   - Request body parsing
   - Database query building
   - Response formatting
3. Output: JSON response or raw text

## Error Scenarios
- Unauthenticated requests to protected endpoints
- Invalid script IDs
- Unauthorized access attempts
- Locked script modification attempts
- Database constraint violations
- Invalid request body

## Dependencies
- Next.js App Router
- NextAuth for session management
- Prisma ORM for database
- Zod for validation (if used)
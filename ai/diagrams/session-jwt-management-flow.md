# Session and JWT Management Flow

## Overview
Complete session management flow using NextAuth.js with JWT strategy, including creation, validation, refresh, and expiration handling.

## Trigger Points
- User login/authentication
- Page load requiring session
- API request with auth
- Session refresh
- Token expiration
- User logout

## Flow Diagram
```mermaid
graph TD
    A[User Login] --> B[NextAuth SignIn]
    B --> C[OAuth Callback]
    C --> D[Profile Data]

    D --> E[JWT Callback]
    E --> F{First Login?}
    F -->|Yes| G[Create User Record]
    F -->|No| H[Update Last Login]

    G --> I[Generate JWT]
    H --> I

    I --> J[Add Claims]
    J --> K[{
      sub: userId,
      username: string,
      email: string,
      isSponsor: boolean,
      iat: issued at,
      exp: expires at
    }]

    K --> L[Sign Token]
    L --> M[Set HTTP-Only Cookie]
    M --> N[next-auth.session-token]

    %% Session Validation
    O[Page Request] --> P[Middleware Check]
    P --> Q[Extract Cookie]
    Q --> R{Cookie Exists?}
    R -->|No| S[Unauthenticated]
    R -->|Yes| T[Verify JWT]

    T --> U{Valid Signature?}
    U -->|No| V[Invalid Session]
    U -->|Yes| W{Expired?}
    W -->|Yes| X[Check Refresh]
    W -->|No| Y[Valid Session]

    %% Client Session
    Z[Client Component] --> AA[useSession Hook]
    AA --> AB[Session Provider]
    AB --> AC{Cached Session?}
    AC -->|Yes| AD[Return Cached]
    AC -->|No| AE[Fetch Session]

    AE --> AF[GET /api/auth/session]
    AF --> AG[Server Validates]
    AG --> AH{Valid?}
    AH -->|Yes| AI[Return Session Data]
    AH -->|No| AJ[Return null]

    AI --> AK[Update Client Cache]
    AK --> AL[Trigger Re-render]

    %% API Authentication
    AM[API Request] --> AN[getServerSession]
    AN --> AO[Read Cookie]
    AO --> AP[Decode JWT]
    AP --> AQ{Valid Token?}
    AQ -->|No| AR[401 Unauthorized]
    AQ -->|Yes| AS[Extract User ID]

    AS --> AT[Query Database]
    AT --> AU[Get User Data]
    AU --> AV[Attach to Request]
    AV --> AW[Process API Call]

    %% Token Refresh
    X --> AX{Within Grace Period?}
    AX -->|Yes| AY[Refresh Token]
    AX -->|No| AZ[Force Re-login]

    AY --> BA[Extend Expiration]
    BA --> BB[Generate New JWT]
    BB --> BC[Update Cookie]
    BC --> BD[Continue Request]

    %% Logout Flow
    BE[Logout Request] --> BF[POST /api/auth/signout]
    BF --> BG[Clear Cookie]
    BG --> BH[Set Max-Age=0]
    BH --> BI[Invalidate Cache]
    BI --> BJ[Redirect to Home]

    %% Session Events
    BK[Session Events] --> BL{Event Type}
    BL -->|Focus| BM[Check Session]
    BL -->|Storage| BN[Sync Tabs]
    BL -->|Visibility| BO[Pause/Resume]

    BM --> BP[Revalidate if Stale]
    BN --> BQ[Broadcast Change]
    BO --> BR[Handle Background]

    %% Cross-Tab Sync
    BS[Tab A Logs In] --> BT[Set Session]
    BT --> BU[Broadcast Event]
    BU --> BV[localStorage Event]
    BV --> BW[Tab B Receives]
    BW --> BX[Update Session]

    %% Security Checks
    BY[Session Security] --> BZ{Check Type}
    BZ -->|CSRF| CA[Verify Token]
    BZ -->|XSS| CB[HTTP-Only Cookies]
    BZ -->|Replay| CC[Check Nonce]

    CA --> CD[CSRF Protection]
    CB --> CE[No JS Access]
    CC --> CF[One-Time Use]

    %% Rate Limiting
    CG[Session Creation] --> CH[Check Rate]
    CH --> CI{Too Many?}
    CI -->|Yes| CJ[Block & Log]
    CI -->|No| CK[Allow Creation]

    %% Session Storage
    CL[Session Data] --> CM{Storage Type}
    CM -->|JWT| CN[Stateless Token]
    CM -->|Database| CO[Session Table]
    CM -->|Redis| CP[Cache Store]

    CN --> CQ[Client Cookie]
    CO --> CR[PostgreSQL]
    CP --> CS[Redis TTL]

    %% Expiration Handling
    CT[Token Expires] --> CU{User Active?}
    CU -->|Yes| CV[Silent Refresh]
    CU -->|No| CW[Let Expire]

    CV --> CX[Background Refresh]
    CW --> CY[Clear Session]
```

## Key Components
- **File**: `app/api/auth/[...nextauth]/route.ts` - Auth configuration
- **Provider**: `components/NextAuthProvider.tsx` - Session context
- **Hook**: `useSession()` - Client session access
- **Function**: `getServerSession()` - Server session access
- **Cookie**: `next-auth.session-token` - JWT storage
- **Config**: JWT expiration (12 hours default)

## Data Flow
1. Input: OAuth profile or credentials
2. Transformations:
   - Profile to user record
   - User to JWT claims
   - JWT signing
   - Cookie setting
3. Output: Authenticated session

## Error Scenarios
- Invalid JWT signature
- Expired tokens
- Missing session cookie
- Database connection failure
- OAuth provider error
- Clock skew issues
- Cookie domain mismatch

## Dependencies
- NextAuth.js v4
- Jose (JWT library)
- HTTP-only cookies
- OAuth providers
- Database for user storage
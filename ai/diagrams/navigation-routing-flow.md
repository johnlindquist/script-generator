# Navigation and Routing Flow

## Overview
Complete navigation flow using Next.js App Router, including dynamic routes, authentication guards, and client-side navigation.

## Trigger Points
- Direct URL access
- Link clicks
- Programmatic navigation
- Browser back/forward
- Authentication redirects

## Flow Diagram
```mermaid
graph TD
    A[User Navigation] --> B{Navigation Type}

    %% Direct URL Access
    B -->|URL Entry| C[Browser Request]
    C --> D[Next.js Server]
    D --> E[App Router Match]
    E --> F{Route Type}

    F -->|Static| G[Static Route]
    F -->|Dynamic| H[Dynamic Route]
    F -->|API| I[API Route]
    F -->|404| J[Not Found Page]

    %% Static Routes
    G --> K{Route Path}
    K -->|/| L[app/page.tsx]
    K -->|/scripts| M[app/scripts/page.tsx]
    K -->|/scripts/new| N[app/scripts/new/page.tsx]
    K -->|/scripts/mine| O[app/scripts/mine/page.tsx]
    K -->|/auth/signin| P[app/auth/signin/page.tsx]

    %% Dynamic Routes
    H --> Q{Dynamic Segment}
    Q -->|[username]/[scriptId]| R[Script Detail Page]
    Q -->|scripts/[scriptId]| S[Script by ID]
    Q -->|api/scripts/[scriptId]| T[Script API]

    R --> U[Parse Params]
    U --> V[Fetch Script Data]
    V --> W[Server Component Render]

    %% Client Navigation
    B -->|Link Click| X[Next Link Component]
    X --> Y[Prefetch on Hover]
    Y --> Z[Client Router]
    Z --> AA[Update URL]
    AA --> AB[Fetch Route Data]
    AB --> AC[Update DOM]

    %% Protected Routes
    AD[Protected Route] --> AE[Middleware Check]
    AE --> AF{Has Session?}
    AF -->|No| AG[Redirect to /auth/signin]
    AF -->|Yes| AH[Allow Access]

    AG --> AI[Save Return URL]
    AI --> AJ[Show Login Page]
    AJ --> AK[After Login]
    AK --> AL[Redirect to Return URL]

    %% Navigation Guards
    AM[Route Change] --> AN[Layout Effect]
    AN --> AO{Need Auth?}
    AO -->|Yes| AP[Check Session]
    AO -->|No| AQ[Proceed]

    AP --> AR{Valid Session?}
    AR -->|No| AS[Redirect to Login]
    AR -->|Yes| AT[Continue Navigation]

    %% Programmatic Navigation
    AU[useRouter Hook] --> AV{Method}
    AV -->|push| AW[router.push('/path')]
    AV -->|replace| AX[router.replace('/path')]
    AV -->|back| AY[router.back()]
    AV -->|forward| AZ[router.forward()]
    AV -->|refresh| BA[router.refresh()]

    AW --> BB[Add to History]
    AX --> BC[Replace History]
    AY --> BD[History -1]
    AZ --> BE[History +1]
    BA --> BF[Revalidate Data]

    %% Layout Nesting
    BG[Root Layout] --> BH[app/layout.tsx]
    BH --> BI[Providers Wrapper]
    BI --> BJ[NextAuthProvider]
    BJ --> BK[Theme Provider]
    BK --> BL[Children Routes]

    BL --> BM{Route Layout}
    BM -->|Scripts| BN[scripts/layout.tsx]
    BM -->|Auth| BO[auth/layout.tsx]
    BN --> BP[Script Page Content]
    BO --> BQ[Auth Page Content]

    %% Navigation State
    BR[Navigation Event] --> BS[Loading State]
    BS --> BT[Show Progress Bar]
    BT --> BU[Fetch Route]
    BU --> BV[Update Content]
    BV --> BW[Hide Progress]

    %% URL State Management
    BX[URL Parameters] --> BY[nuqs Hooks]
    BY --> BZ{Param Change}
    BZ -->|Search| CA[Update Search State]
    BZ -->|Filter| CB[Update Filter State]
    BZ -->|Page| CC[Update Page Number]

    CA --> CD[Trigger Data Fetch]
    CB --> CD
    CC --> CD

    %% Error Boundaries
    CE[Navigation Error] --> CF{Error Type}
    CF -->|404| CG[Not Found Component]
    CF -->|500| CH[Error Component]
    CF -->|Auth| CI[Login Redirect]

    CG --> CJ[app/not-found.tsx]
    CH --> CK[app/error.tsx]
```

## Key Components
- **File**: `app/layout.tsx` - Root layout with providers
- **File**: `components/NavBar.tsx` - Navigation UI
- **Folder**: `app/` - App Router pages
- **Hook**: `useRouter()` - Client navigation
- **Hook**: `usePathname()` - Current path
- **Component**: `<Link>` - Next.js navigation
- **Middleware**: Authentication checks

## Data Flow
1. Input: Navigation request (URL, click, programmatic)
2. Transformations:
   - Route matching
   - Parameter extraction
   - Authentication verification
   - Data fetching
3. Output: Rendered page or redirect

## Error Scenarios
- Invalid dynamic parameters
- Authentication failure
- Missing required data
- Network failure during navigation
- Invalid URL structure
- Middleware errors

## Dependencies
- Next.js 15 App Router
- NextAuth for protected routes
- nuqs for URL state
- React Server Components
- Client-side router
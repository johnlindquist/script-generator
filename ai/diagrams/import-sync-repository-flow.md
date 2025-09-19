# Import and Repository Sync Flow

## Overview
Flow for importing existing scripts from repositories and syncing with GitHub, including parsing, validation, and bulk import operations.

## Trigger Points
- Import page access
- GitHub repo URL submission
- Sync repository button
- Bulk import request
- Auto-sync schedule

## Flow Diagram
```mermaid
graph TD
    A[Import Request] --> B{Import Type}

    %% Single Script Import
    B -->|Single Script| C[Paste Script Content]
    C --> D[Parse TypeScript]
    D --> E{Valid Script Kit?}
    E -->|No| F[Show Validation Error]
    E -->|Yes| G[Extract Metadata]

    G --> H[Parse Imports]
    H --> I[Detect Script Kit APIs]
    I --> J[Extract Title/Description]
    J --> K[Generate Summary]
    K --> L[Save as New Script]

    %% GitHub Repo Import
    B -->|GitHub Repo| M[Enter Repo URL]
    M --> N[Parse URL]
    N --> O[Extract Owner/Repo]
    O --> P[API: POST /api/sync-repo]

    P --> Q[Server Handler]
    Q --> R[GitHub API Client]
    R --> S[List Repository Files]
    S --> T{Has .kenv folder?}

    T -->|Yes| U[Scan Scripts Directory]
    T -->|No| V[Scan Root for .ts/.js]

    U --> W[Filter Script Files]
    V --> W
    W --> X[For Each File]

    X --> Y[Fetch File Content]
    Y --> Z[GET repos/:owner/:repo/contents/:path]
    Z --> AA[Decode Base64]
    AA --> AB[Parse Script]

    AB --> AC{Is Script Kit?}
    AC -->|Yes| AD[Add to Import List]
    AC -->|No| AE[Skip File]

    AD --> AF[Collect All Scripts]
    AF --> AG[Return Script List]

    %% Bulk Import Processing
    AG --> AH[Show Import Preview]
    AH --> AI[User Selects Scripts]
    AI --> AJ[Confirm Import]
    AJ --> AK[API: POST /api/import-scripts]

    AK --> AL[Batch Process]
    AL --> AM[For Each Script]
    AM --> AN[Create Script Record]
    AN --> AO[Set Import Metadata]
    AO --> AP[{
      source: 'github',
      repoUrl: string,
      originalPath: string,
      importedAt: Date
    }]

    %% Sync Existing Scripts
    AQ[Sync Repository] --> AR[Get User Repos]
    AR --> AS[GitHub API: List Repos]
    AS --> AT[Filter Script Kit Repos]
    AT --> AU[Show Repo List]
    AU --> AV[Select Repository]

    AV --> AW[Fetch Latest]
    AW --> AX[Compare with Local]
    AX --> AY{Changes Detected?}
    AY -->|Yes| AZ[Show Diff]
    AY -->|No| BA[Already Synced]

    AZ --> BB[User Reviews]
    BB --> BC{Action}
    BC -->|Update| BD[Overwrite Local]
    BC -->|Keep Local| BE[Skip Update]
    BC -->|Merge| BF[Merge Changes]

    %% Validation Pipeline
    BG[Script Validation] --> BH[Parse AST]
    BH --> BI[Check Imports]
    BI --> BJ{Has @johnlindquist/kit?}
    BJ -->|No| BK[Not Script Kit]
    BJ -->|Yes| BL[Valid Script]

    BL --> BM[Extract Features]
    BM --> BN[{
      usesPrompt: boolean,
      usesArg: boolean,
      usesEnv: boolean,
      usesMacro: boolean,
      dependencies: string[]
    }]

    %% Conflict Resolution
    BO[Name Conflict] --> BP{Script Exists?}
    BP -->|Yes| BQ[Check Content Hash]
    BQ --> BR{Same Content?}
    BR -->|Yes| BS[Skip Duplicate]
    BR -->|No| BT[Generate Unique Name]
    BT --> BU[Append Number]
    BU --> BV[script-name-2]

    %% Auto Sync
    BW[Scheduled Sync] --> BX[Cron Job]
    BX --> BY[Daily at Midnight]
    BY --> BZ[Check Sync Settings]
    BZ --> CA{Auto-Sync Enabled?}
    CA -->|Yes| CB[Fetch Updates]
    CA -->|No| CC[Skip]

    CB --> CD[Silent Update]
    CD --> CE[Update Version]
    CE --> CF[Notify User]

    %% Import History
    CG[Track Import] --> CH[Create Import Record]
    CH --> CI[{
      userId: string,
      source: string,
      count: number,
      timestamp: Date,
      details: JSON
    }]
    CI --> CJ[Store in Database]

    %% Error Handling
    CK[Import Error] --> CL{Error Type}
    CL -->|Rate Limit| CM[Queue for Later]
    CL -->|Parse Error| CN[Log & Skip]
    CL -->|Network| CO[Retry with Backoff]
    CL -->|Auth| CP[Re-authenticate]

    %% Export Flow
    CQ[Export Scripts] --> CR[Select Scripts]
    CR --> CS[Generate Export]
    CS --> CT{Format}
    CT -->|ZIP| CU[Create Archive]
    CT -->|Git| CV[Create Git Bundle]
    CT -->|JSON| CW[Export Manifest]
```

## Key Components
- **File**: `app/api/import-scripts/route.ts` - Bulk import endpoint
- **File**: `app/api/sync-repo/route.ts` - Repository sync endpoint
- **File**: `app/scripts/import/page.tsx` - Import UI page
- **API**: GitHub Contents API for file fetching
- **Parser**: TypeScript AST parser for validation
- **Function**: Script Kit detection logic

## Data Flow
1. Input: GitHub repo URL or script content
2. Transformations:
   - Repository scanning
   - Content validation
   - Metadata extraction
   - Conflict resolution
3. Output: Imported scripts in database

## Error Scenarios
- Invalid repository URL
- GitHub API rate limiting
- Invalid script format
- Authentication failure
- Network timeouts
- Merge conflicts

## Dependencies
- GitHub API (@octokit/rest)
- TypeScript parser
- Base64 decoding
- Diff algorithm for merging
# Script Installation and CLI Flow

## Overview
Complete flow for installing scripts via Script Kit CLI, tracking installations, and managing the desktop app integration.

## Trigger Points
- Install button click in web UI
- CLI command execution
- Script Kit app detection
- Installation tracking
- Download script file

## Flow Diagram
```mermaid
graph TD
    A[User Clicks Install] --> B[InstallButtonClient]
    B --> C{Authenticated?}
    C -->|No| D[Prompt Sign In]
    C -->|Yes| E[Check Script Kit]

    E --> F{Script Kit Installed?}
    F -->|No| G[Show Install Guide]
    F -->|Yes| H[Generate Install Command]

    G --> I[Link to Script Kit]
    I --> J[scriptkit.com Download]

    H --> K[Create Command]
    K --> L[kit install scriptname --url]
    L --> M[Copy to Clipboard]
    M --> N[Show Success Toast]

    %% Save and Install Flow
    O[Save & Install] --> P[Save Script First]
    P --> Q[Get Script ID]
    Q --> R[Track Installation]
    R --> S[API: POST /api/install]

    S --> T[Server Handler]
    T --> U[Get User Session]
    U --> V{Valid Session?}
    V -->|No| W[401 Error]
    V -->|Yes| X[Create Install Record]

    X --> Y[prisma.install.upsert]
    Y --> Z[{
      userId: string,
      scriptId: string,
      installedAt: Date,
      version: string
    }]
    Z --> AA[Update Install Count]

    %% CLI Protocol Handler
    AB[Protocol URL] --> AC[kit://]
    AC --> AD[Script Kit App]
    AD --> AE[Parse URL]
    AE --> AF{Action Type}

    AF -->|install| AG[Install Script]
    AF -->|open| AH[Open Script]
    AF -->|edit| AI[Edit Script]

    AG --> AJ[Download Content]
    AJ --> AK[GET /api/scripts/[id]/raw]
    AK --> AL[Return TypeScript]
    AL --> AM[Save to ~/.kenv/scripts]
    AM --> AN[Register Script]

    %% Raw Content Download
    AO[Download Button] --> AP[Get Raw URL]
    AP --> AQ[/api/scripts/[id]/raw]
    AQ --> AR[Fetch Content]
    AR --> AS[Set Headers]
    AS --> AT[Content-Type: text/plain]
    AT --> AU[Content-Disposition: attachment]
    AU --> AV[Download File]

    %% Installation Tracking
    AW[Track Install] --> AX[Increment Counter]
    AX --> AY[Update Script Stats]
    AY --> AZ[{
      installs: count + 1,
      lastInstalled: Date
    }]

    %% Multiple Versions
    BA[Version Check] --> BB{Has Versions?}
    BB -->|Yes| BC[Show Version List]
    BB -->|No| BD[Use Latest]

    BC --> BE[User Selects]
    BE --> BF[Get Version Content]
    BF --> BG[Install Specific]

    %% Script Kit Detection
    BH[Detect Script Kit] --> BI{Platform}
    BI -->|macOS| BJ[Check ~/.kenv]
    BI -->|Windows| BK[Check AppData]
    BI -->|Linux| BL[Check ~/.config]

    BJ --> BM{Directory Exists?}
    BK --> BM
    BL --> BM
    BM -->|Yes| BN[Script Kit Found]
    BM -->|No| BO[Not Installed]

    %% Deep Link Flow
    BP[Web Install] --> BQ[Generate Deep Link]
    BQ --> BR[Encode Parameters]
    BR --> BS[kit://install?url=...]
    BS --> BT[Open in Browser]
    BT --> BU{Handler Registered?}
    BU -->|Yes| BV[Launch Script Kit]
    BU -->|No| BW[Fallback Instructions]

    %% Batch Installation
    BX[Install Multiple] --> BY[Select Scripts]
    BY --> BZ[Create Bundle]
    BZ --> CA[Generate Manifest]
    CA --> CB[{
      scripts: [{
        id: string,
        name: string,
        content: string
      }],
      metadata: object
    }]
    CB --> CC[Download as ZIP]

    %% Update Check
    CD[Check Updates] --> CE[Compare Versions]
    CE --> CF{Newer Available?}
    CF -->|Yes| CG[Show Update Badge]
    CF -->|No| CH[Up to Date]
    CG --> CI[Update Button]
    CI --> AG

    %% Error Recovery
    CJ[Install Failed] --> CK{Error Type}
    CK -->|Network| CL[Retry Download]
    CK -->|Permission| CM[Check Access]
    CK -->|Conflict| CN[Rename Script]

    CL --> CO[Exponential Backoff]
    CM --> CP[Request Admin]
    CN --> CQ[Suggest New Name]
```

## Key Components
- **File**: `components/InstallButtonClient.tsx` - Install UI
- **File**: `app/api/install/route.ts` - Installation tracking
- **File**: `app/api/scripts/[id]/raw/route.ts` - Raw content endpoint
- **Model**: `prisma.install` - Installation records
- **Protocol**: `kit://` - Script Kit URL scheme
- **Path**: `~/.kenv/scripts/` - Local script directory

## Data Flow
1. Input: Script ID and user action
2. Transformations:
   - Generate install command
   - Track installation
   - Download script content
   - Register with Script Kit
3. Output: Installed script ready to run

## Error Scenarios
- Script Kit not installed
- Network failure during download
- Permission denied for file write
- Duplicate script names
- Version mismatch
- Invalid script content

## Dependencies
- Script Kit desktop app
- Protocol handler registration
- File system access
- Clipboard API
- Download API
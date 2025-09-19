# Script Fork and Versioning Flow

## Overview
Complete flow for forking scripts and maintaining version history, including parent-child relationships and content snapshots.

## Trigger Points
- User clicks "Fork" button on script
- Script content is updated
- Version history requested
- Fork tree visualization

## Flow Diagram
```mermaid
graph TD
    A[User Clicks Fork] --> B[ForkButtonClient]
    B --> C[Check Authentication]
    C --> D{Authenticated?}
    D -->|No| E[Redirect to Login]
    D -->|Yes| F[Get Original Script]

    F --> G[API: GET /api/scripts/[id]]
    G --> H[Fetch Script Data]
    H --> I{Script Exists?}
    I -->|No| J[404 Error]
    I -->|Yes| K[Extract Script Content]

    K --> L[Prepare Fork Data]
    L --> M[Generate New ID]
    M --> N[Set parentId Reference]
    N --> O[Copy Content & Metadata]

    O --> P[API: POST /api/scripts]
    P --> Q[prisma.script.create]
    Q --> R[Create Fork Record]
    R --> S[Set Owner to Current User]
    S --> T[Link to Parent Script]

    T --> U[Create Initial Version]
    U --> V[prisma.scriptVersion.create]
    V --> W[Store Content Snapshot]

    W --> X[Return Fork ID]
    X --> Y[Navigate to Fork]
    Y --> Z[Show Forked Script]

    %% Version Creation Flow
    AA[Update Script] --> AB[Check Lock Status]
    AB --> AC{Is Locked?}
    AC -->|Yes| AD[Prevent Update]
    AC -->|No| AE[Create Version Snapshot]

    AE --> AF[Get Current Content]
    AF --> AG[prisma.scriptVersion.create]
    AG --> AH[Link to Script]
    AH --> AI[Store Timestamp]
    AI --> AJ[Update Script Content]

    %% Version History Flow
    AK[View History] --> AL[Get Script ID]
    AL --> AM[prisma.scriptVersion.findMany]
    AM --> AN[Order by createdAt DESC]
    AN --> AO[Return Version List]

    AO --> AP[Display Timeline]
    AP --> AQ{User Selects Version}
    AQ --> AR[Load Version Content]
    AR --> AS[Display in Modal]
    AS --> AT{Action?}
    AT -->|Restore| AU[Replace Current]
    AT -->|Compare| AV[Show Diff View]
    AT -->|Close| AW[Return to Script]

    %% Fork Tree Flow
    AX[View Fork Tree] --> AY[Get Root Script]
    AY --> AZ[Recursive Query]
    AZ --> BA[Load All Children]
    BA --> BB[Build Tree Structure]

    BB --> BC[CTE Query]
    BC --> BD[
      WITH RECURSIVE fork_tree AS (
        SELECT * FROM scripts WHERE id = ?
        UNION ALL
        SELECT s.* FROM scripts s
        JOIN fork_tree ft ON s.parentId = ft.id
      )
    ]
    BD --> BE[Return Tree Data]

    BE --> BF[Render Tree View]
    BF --> BG[Show Relationships]
    BG --> BH[Display Fork Count]

    %% Lock Mechanism
    BI[Check Lock Criteria] --> BJ{Has Many Stars?}
    BJ -->|Yes| BK[Auto Lock Script]
    BJ -->|No| BL{Many Installs?}
    BL -->|Yes| BK
    BL -->|No| BM{Many Forks?}
    BM -->|Yes| BK
    BM -->|No| BN[Keep Unlocked]

    BK --> BO[Set locked = true]
    BO --> BP[Prevent Edits]
    BP --> BQ[Allow Fork Only]

    %% Parent-Child Sync
    BR[Parent Updated] --> BS{Notify Children?}
    BS -->|Yes| BT[Optional Update Notice]
    BS -->|No| BU[No Action]

    BT --> BV[Show Update Badge]
    BV --> BW{User Choice}
    BW -->|View Changes| BX[Show Diff]
    BW -->|Merge| BY[Merge Changes]
    BW -->|Ignore| BZ[Dismiss Notice]
```

## Key Components
- **File**: `components/ForkButtonClient.tsx` - Fork UI component
- **Model**: `prisma.script` - Parent-child relationships
- **Model**: `prisma.scriptVersion` - Version snapshots
- **Field**: `script.parentId` - Fork reference
- **Field**: `script.locked` - Edit protection
- **Relation**: Self-referential fork tree

## Data Flow
1. Input: Original script ID to fork
2. Transformations:
   - Content duplication
   - Ownership assignment
   - Parent reference creation
   - Version snapshot
3. Output: New forked script with history

## Error Scenarios
- Original script not found
- User not authenticated
- Database constraint violation
- Circular fork reference
- Version storage failure
- Deep recursion in fork tree

## Dependencies
- Prisma self-relations
- Recursive CTE queries
- Version diffing library
- Navigation router
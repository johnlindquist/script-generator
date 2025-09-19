# Search, Filter, and Pagination Flow

## Overview
Complete flow for searching scripts with trigram indexing, filtering by various criteria, and infinite scroll pagination.

## Trigger Points
- User types in search box
- Filter toggles (mine, starred, etc.)
- Scroll reaches bottom (infinite scroll)
- URL parameter changes
- Tag selection

## Flow Diagram
```mermaid
graph TD
    A[User Input] --> B{Input Type}

    %% Search Flow
    B -->|Search Text| C[Search Input Field]
    C --> D[Debounce 300ms]
    D --> E[Update URL Params]
    E --> F[nuqs State Update]
    F --> G[Trigger Data Fetch]

    G --> H[API: GET /api/scripts]
    H --> I[Parse Query Params]
    I --> J{Search Query?}

    J -->|Yes| K[Trigram Search]
    J -->|No| L[Standard Query]

    K --> M[Build SQL Query]
    M --> N[prisma.$queryRaw]
    N --> O[`
      SELECT * FROM scripts
      WHERE content %> $1
      ORDER BY similarity(content, $1) DESC
    `]

    L --> P[prisma.script.findMany]
    P --> Q[Apply Filters]

    %% Filter Flow
    B -->|Filter Toggle| R[Filter Button]
    R --> S{Filter Type}
    S -->|Mine| T[Add userId Filter]
    S -->|Starred| U[Add starred = true]
    S -->|Verified| V[Join Verifications]
    S -->|Date Range| W[Add createdAt Range]

    T --> X[Update Query Object]
    U --> X
    V --> X
    W --> X
    X --> Y[Merge with Search]
    Y --> G

    %% Pagination Flow
    B -->|Scroll| Z[InfiniteScrollGrid]
    Z --> AA[Intersection Observer]
    AA --> AB{Near Bottom?}
    AB -->|No| AC[Continue Monitoring]
    AB -->|Yes| AD[Check Loading State]

    AD --> AE{Already Loading?}
    AE -->|Yes| AF[Skip]
    AE -->|No| AG[Load Next Page]

    AG --> AH[Increment Page]
    AH --> AI[Add Skip/Take]
    AI --> AJ[Fetch with Offset]

    AJ --> AK[API Call]
    AK --> AL[Return Page Data]
    AL --> AM{Has More?}
    AM -->|Yes| AN[Append to List]
    AM -->|No| AO[Set End Reached]

    AN --> AP[Update UI]
    AP --> AQ[Reset Observer]
    AO --> AR[Hide Loader]

    %% URL State Sync
    AS[URL Parameters] --> AT[Parse on Mount]
    AT --> AU[Extract Params]
    AU --> AV[{
      q: search query,
      filter: filter type,
      tags: selected tags,
      page: current page
    }]
    AV --> AW[Initialize State]
    AW --> AX[Fetch Initial Data]

    %% Tag Filter
    AY[Tag Selection] --> AZ[Update Tag Array]
    AZ --> BA[Build Tag Query]
    BA --> BB[Join Script-Tag Relation]
    BB --> BC[Filter by Tag IDs]
    BC --> G

    %% Sort Options
    BD[Sort Dropdown] --> BE{Sort By}
    BE -->|Recent| BF[ORDER BY createdAt DESC]
    BE -->|Popular| BG[ORDER BY stars DESC]
    BE -->|Most Forked| BH[ORDER BY fork_count DESC]
    BE -->|Alphabetical| BI[ORDER BY title ASC]

    BF --> BJ[Apply to Query]
    BG --> BJ
    BH --> BJ
    BI --> BJ
    BJ --> G

    %% Results Processing
    O --> BK[Process Results]
    Q --> BK
    BK --> BL[Include Relations]
    BL --> BM[{
      owner: true,
      favorites: true,
      installs: { count: true },
      _count: { children: true }
    }]
    BM --> BN[Format Response]
    BN --> BO[Return to Client]

    %% Cache Management
    BP[SWR Cache] --> BQ[Check Cache]
    BQ --> BR{Cache Hit?}
    BR -->|Yes| BS[Return Cached]
    BR -->|No| BT[Fetch Fresh]
    BS --> BU[Background Revalidate]
    BT --> BV[Update Cache]

    %% Error States
    BW[Search Error] --> BX{Error Type}
    BX -->|No Results| BY[Show Empty State]
    BX -->|Query Error| BZ[Show Error Message]
    BX -->|Network| CA[Show Retry]
```

## Key Components
- **File**: `components/InfiniteScrollGrid.tsx` - Scroll container
- **File**: `app/api/scripts/route.ts` - Search endpoint
- **Index**: Trigram GIN index on content field
- **Library**: `nuqs` for URL state management
- **Library**: `SWR` for data fetching/caching
- **API**: Intersection Observer for scroll detection

## Data Flow
1. Input: Search query, filters, page number
2. Transformations:
   - URL parameter parsing
   - Query building with filters
   - Trigram similarity scoring
   - Pagination offset calculation
3. Output: Paginated script results

## Error Scenarios
- Invalid search syntax
- Database query timeout
- Pagination beyond available data
- URL parameter corruption
- Cache invalidation issues
- Concurrent filter updates

## Dependencies
- PostgreSQL trigram extension
- GIN index for full-text search
- Intersection Observer API
- React Query/SWR
- URL search params API
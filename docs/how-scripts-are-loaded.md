# How Scripts Are Currently Displayed on the Homepage

## Overview
Scripts are displayed in a paginated feed on the homepage using a combination of server-side rendering (SSR) for initial data and client-side fetching for subsequent interactions. The system supports both grid and list views, with various sorting options.

## Current Implementation

### 1. **Default Sorting**
- Scripts are sorted by `createdAt` date in descending order by default (newest first)
- This is configured in `ViewToggle.tsx` where the default sort value is set to `'createdAt'`

### 2. **Available Sorting Options**
From `ScriptSort.tsx`, the following sort modes are available:
- **Date Created** (`createdAt`) - Default, newest first
- **Title** (`alphabetical`) - Alphabetical order by script title
- **Username** (`username`) - Alphabetical order by owner's username
- **Favorites** (`favorites`) - Most favorited scripts first
- **Downloads** (`downloads`) - Most downloaded/installed scripts first
- **Verifications** (`verified`) - Most verified scripts first

### 3. **No User Deduplication or Grouping**
- There is **NO deduplication** by user - if a user has multiple scripts, they all appear in the feed
- There is **NO grouping** by user - scripts from the same user can appear scattered throughout the feed based on the sort order
- Each script is treated as an independent entity in the feed

### 4. **Feed Structure**

#### Data Fetching Flow:
1. **Initial Server-Side Fetch**: `app/page.tsx` calls `fetchScriptsServerSide()` to get initial data
2. **Client-Side Updates**: `ViewToggle.tsx` uses SWR to fetch updates when sorting/pagination changes
3. **API Endpoint**: Both use the `/api/scripts` endpoint which queries the database

#### Display Components:
- **ViewToggle**: Main container that manages view mode (grid/list) and sorting
- **ScriptListClient**: Handles grid view with pagination
- **ScriptListAll**: Handles list view
- **ScriptCard**: Individual script display component

#### Pagination:
- 12 scripts per page (configured as `PAGE_SIZE`)
- Pagination state managed via URL query parameters
- Total pages calculated based on total script count

### 5. **Query Structure**
The database query in `/api/scripts/route.ts`:
- Filters for `status: 'ACTIVE'` and `saved: true` scripts only
- Applies the selected sort order
- Supports search functionality across:
  - Script content
  - Script title
  - Owner username
- Returns script data with:
  - Owner information (username, id, fullName, sponsorship status)
  - Counts for verifications, favorites, and installs
  - User-specific verification/favorite status (if authenticated)

### 6. **Caching Strategy**
- Public requests (non-authenticated): 60-second edge cache with 30-second stale-while-revalidate
- Authenticated requests: No caching (private, max-age=0)

### 7. **View Modes**
- **Grid View**: Default, shows scripts as cards in a responsive grid
- **List View**: Alternative view showing scripts in a vertical list
- View preference is persisted in localStorage

## Key Observations

1. **No Smart Feed Algorithm**: Scripts are displayed in simple chronological or metric-based order without any personalization or diversity considerations

2. **Potential for User Domination**: A single active user could potentially flood the recent scripts feed with multiple submissions

3. **No Batching or Grouping**: Each script is an independent item regardless of author

4. **Simple Linear Pagination**: Standard pagination without infinite scroll or smart loading

5. **Performance Optimizations**: 
   - Server-side rendering for initial load
   - Client-side caching with SWR
   - Edge caching for public data

This straightforward approach prioritizes simplicity and performance but doesn't include advanced feed algorithms or user diversity considerations.
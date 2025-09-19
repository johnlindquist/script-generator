# User Interaction UI Flow

## Overview
Complete user interaction flow covering all UI components and their event handlers, from navigation to script manipulation.

## Trigger Points
- Page navigation clicks
- Button interactions (Generate, Save, Install, Fork, etc.)
- Form submissions
- Keyboard shortcuts
- Monaco editor changes
- Toast notifications

## Flow Diagram
```mermaid
graph TD
    A[User Loads Page] --> B[Next.js App Router]
    B --> C[Layout Component]
    C --> D[NavBar Component]

    D --> E{User Action}

    %% Navigation Flow
    E -->|Click Logo| F[Navigate Home]
    E -->|Click Browse| G[Navigate /scripts]
    E -->|Click New| H[Navigate /scripts/new]
    E -->|Click Sign In| I[Auth Flow]

    %% Script Generation UI
    H --> J[ScriptGenerationClient]
    J --> K[Render UI Components]
    K --> L[Prompt Input Field]
    K --> M[Monaco Editor]
    K --> N[Action Buttons]
    K --> O[Suggestions Carousel]

    L --> P{User Types}
    P -->|< 15 chars| Q[Show Character Count]
    P -->|>= 15 chars| R[Enable Generate Button]

    R --> S{Click Generate}
    S --> T[Dispatch GENERATE_DRAFT]
    T --> U[Show Loading State]
    U --> V[Streaming Animation]

    %% Suggestions Flow
    O --> W{Click Suggestion}
    W --> X[Dispatch FROM_SUGGESTION]
    X --> T

    %% Lucky Button
    N --> Y{Click Lucky}
    Y --> Z[Fetch Random Prompt]
    Z --> AA[Set Prompt]
    AA --> T

    %% Editor Interactions
    M --> AB{User Edits}
    AB --> AC[UPDATE_EDITABLE_SCRIPT]
    AC --> AD[Update State]
    AD --> AE[Re-render Editor]

    %% Save/Install Flow
    N --> AF{After Generation}
    AF -->|Click Save| AG[SAVE_SCRIPT Event]
    AG --> AH[Show Saving State]
    AH --> AI[API Call]
    AI --> AJ{Success?}
    AJ -->|Yes| AK[Show Success Toast]
    AJ -->|No| AL[Show Error Toast]

    AF -->|Click Install| AM[SAVE_AND_INSTALL Event]
    AM --> AN[Show Installing State]
    AN --> AO[API Call + Track]
    AO --> AJ

    %% Script Card Interactions
    G --> AP[Script Grid]
    AP --> AQ[ScriptCard Components]
    AQ --> AR{Card Actions}

    AR -->|Click Card| AS[Navigate to Script]
    AR -->|Click Star| AT[Toggle Star API]
    AR -->|Click Fork| AU[Fork Script API]
    AR -->|Click Install| AV[Install Tracking API]
    AR -->|Click Verify| AW[Verification API]
    AR -->|Click Favorite| AX[Favorite API]

    AT --> AY[Optimistic Update]
    AY --> AZ[Revalidate Data]
    AU --> BA[Create Fork]
    BA --> BB[Navigate to Fork]
    AV --> BC[Track Installation]
    AW --> BD[Toggle Verification]
    AX --> BE[Toggle Favorite]

    %% Delete Flow
    AR -->|Click Delete| BF[Show Confirmation]
    BF --> BG{Confirm?}
    BG -->|Yes| BH[Delete API]
    BG -->|No| BI[Cancel]
    BH --> BJ[Remove from UI]

    %% Infinite Scroll
    AP --> BK[InfiniteScrollGrid]
    BK --> BL{Scroll to Bottom}
    BL --> BM[Load More Trigger]
    BM --> BN[Fetch Next Page]
    BN --> BO[Append Results]

    %% Toast Notifications
    AK --> BP[Toast Component]
    AL --> BP
    BP --> BQ[Auto Dismiss]
    BQ --> BR[Remove Toast]

    %% Keyboard Shortcuts
    BS[Global Key Listener] --> BT{Key Combo}
    BT -->|Cmd+Enter| BU[Generate Script]
    BT -->|Cmd+S| BV[Save Script]
    BT -->|Escape| BW[Reset/Cancel]
```

## Key Components
- **File**: `components/ScriptGenerationClient.tsx` - Main generation UI
- **File**: `components/NavBar.tsx` - Navigation component
- **File**: `components/ScriptCard.tsx` - Script display cards
- **File**: `components/InfiniteScrollGrid.tsx` - Infinite scroll container
- **File**: `components/FavoriteButtonClient.tsx` - Favorite interaction
- **File**: `components/InstallButtonClient.tsx` - Install tracking
- **File**: `components/DeleteButtonClient.tsx` - Delete with confirmation
- **File**: `components/ScriptSuggestions.tsx` - Suggestion carousel
- **Function**: Event handlers (onClick, onChange, onSubmit)

## Data Flow
1. Input: User interactions (clicks, keyboard, scroll)
2. Transformations:
   - Event handling
   - State updates (React/XState)
   - API calls
   - Optimistic UI updates
3. Output: UI re-renders, navigation, toasts

## Error Scenarios
- Network failures on API calls
- Session expiration during interaction
- Optimistic update rollback
- Rate limit exceeded
- Invalid user input
- Component unmount during async operations

## Dependencies
- React event system
- Next.js router
- XState for complex state
- React Hot Toast for notifications
- SWR for data fetching
- Framer Motion for animations
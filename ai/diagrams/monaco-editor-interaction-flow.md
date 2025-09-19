# Monaco Editor Interaction Flow

## Overview
Complete flow for Monaco Editor integration, including code editing, syntax highlighting, IntelliSense, and real-time updates.

## Trigger Points
- Editor mount/initialization
- User typing/editing
- AI stream updates
- Theme changes
- Language detection
- Save keyboard shortcuts

## Flow Diagram
```mermaid
graph TD
    A[Component Mount] --> B[Initialize Monaco]
    B --> C[Load Monaco Loader]
    C --> D[Configure Options]

    D --> E[Set Editor Config]
    E --> F[{
      language: 'typescript',
      theme: 'vs-dark',
      minimap: { enabled: false },
      fontSize: 14,
      wordWrap: 'on',
      automaticLayout: true
    }]

    F --> G[Create Editor Instance]
    G --> H[Set Initial Value]
    H --> I[Configure TypeScript]

    I --> J[Add Script Kit Types]
    J --> K[Load Type Definitions]
    K --> L[Setup IntelliSense]

    %% User Editing Flow
    M[User Types] --> N[onChange Event]
    N --> O[Debounce Input]
    O --> P{Debounce Timer}
    P -->|< 500ms| Q[Reset Timer]
    P -->|>= 500ms| R[Process Change]

    R --> S[Get Editor Value]
    S --> T[Dispatch UPDATE_EDITABLE_SCRIPT]
    T --> U[Update XState Context]
    U --> V[Trigger Re-render]

    %% AI Stream Updates
    W[AI Stream Chunk] --> X[Receive Update]
    X --> Y[Get Current Position]
    Y --> Z[Create Edit Operation]

    Z --> AA[editor.executeEdits]
    AA --> AB[{
      range: new Range(),
      text: chunk,
      forceMoveMarkers: true
    }]
    AB --> AC[Apply Edit]
    AC --> AD[Preserve Cursor]
    AD --> AE[Scroll to View]

    %% Syntax Highlighting
    AF[Content Changed] --> AG[Tokenize Code]
    AG --> AH[Apply Grammar]
    AH --> AI[TypeScript Parser]
    AI --> AJ[Generate Tokens]
    AJ --> AK[Apply Theme Colors]

    %% IntelliSense Flow
    AL[Cursor Position] --> AM[Trigger Completion]
    AM --> AN{Context Type}
    AN -->|Import| AO[Show Script Kit APIs]
    AN -->|Property| AP[Show Object Members]
    AN -->|Function| AQ[Show Parameters]

    AO --> AR[Completion Provider]
    AP --> AR
    AQ --> AR
    AR --> AS[Generate Suggestions]
    AS --> AT[Display Dropdown]
    AT --> AU{User Selects}
    AU --> AV[Insert Completion]

    %% Error Detection
    AW[Code Analysis] --> AX[TypeScript Service]
    AX --> AY[Validate Syntax]
    AY --> AZ{Has Errors?}
    AZ -->|Yes| BA[Mark Error Lines]
    AZ -->|No| BB[Clear Markers]

    BA --> BC[Show Red Squiggles]
    BC --> BD[Add Error Tooltip]
    BD --> BE[Update Problems Panel]

    %% Keyboard Shortcuts
    BF[Key Press] --> BG{Key Combo}
    BG -->|Cmd+S| BH[Save Script]
    BG -->|Cmd+Enter| BI[Execute/Generate]
    BG -->|Cmd+/| BJ[Toggle Comment]
    BG -->|Cmd+F| BK[Find/Replace]
    BG -->|Cmd+Z| BL[Undo]
    BG -->|Cmd+Shift+Z| BM[Redo]

    %% Format Document
    BN[Format Request] --> BO[Prettier Integration]
    BO --> BP[Parse AST]
    BP --> BQ[Apply Rules]
    BQ --> BR[{
      semi: false,
      singleQuote: true,
      tabWidth: 2
    }]
    BR --> BS[Replace Content]

    %% Theme Switching
    BT[Theme Change] --> BU{Theme Type}
    BU -->|Dark| BV[monaco.editor.setTheme('vs-dark')]
    BU -->|Light| BW[monaco.editor.setTheme('vs')]
    BV --> BX[Update Colors]
    BW --> BX

    %% Cleanup
    BY[Component Unmount] --> BZ[Dispose Editor]
    BZ --> CA[Clear Event Listeners]
    CA --> CB[Free Memory]
    CB --> CC[Remove DOM Elements]

    %% Responsive Layout
    CD[Window Resize] --> CE[Detect Size Change]
    CE --> CF[editor.layout()]
    CF --> CG[Recalculate Dimensions]
    CG --> CH[Update Viewport]
```

## Key Components
- **File**: `components/MonacoEditor.tsx` - Editor wrapper component
- **Library**: `@monaco-editor/react` - React Monaco bindings
- **Config**: Editor options and TypeScript settings
- **Types**: `kit/types/*.d.ts` - Script Kit type definitions
- **Event**: `onDidChangeModelContent` - Change listener
- **API**: `editor.executeEdits()` - Programmatic updates

## Data Flow
1. Input: User keystrokes or AI stream chunks
2. Transformations:
   - Text to AST tokens
   - Syntax highlighting
   - Error detection
   - Code formatting
3. Output: Rendered code with features

## Error Scenarios
- Monaco CDN load failure
- TypeScript service crash
- Memory leak from listeners
- Large file performance issues
- Syntax error recovery
- IntelliSense timeout

## Dependencies
- Monaco Editor (VS Code engine)
- TypeScript language service
- Prettier for formatting
- Script Kit type definitions
- React effect hooks
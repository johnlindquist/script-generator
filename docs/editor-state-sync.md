# Monaco Editor State Synchronization

This document outlines the critical requirements and implementation details for properly synchronizing the Monaco editor with streaming text during script generation.

## Core Requirements

The script generation system relies on several key mechanisms working together to ensure text appears correctly in the editor:

### 1. Editor Reference Management

- **Editor Initialization**: The editor reference must be properly captured during the `handleEditorDidMount` callback.
- **Reference Persistence**: The editor reference is stored in a React ref (`editorRef`) to maintain access across renders.

```typescript
const handleEditorDidMount = (editor: unknown) => {
  // Create a wrapper that matches our EditorRef interface
  const editorWrapper: EditorRef = {
    getModel: () => {
      const model = (editor as any).getModel()
      return model
    },
    revealLine: (line: number) => (editor as any).revealLine(line),
    revealLineInCenter: (line: number) => (editor as any).revealLineInCenter(line),
    deltaDecorations: (oldDecorations: string[], newDecorations: unknown[]) =>
      (editor as any).deltaDecorations(oldDecorations, newDecorations),
  }

  editorRef.current = editorWrapper
  console.log('[EDITOR] Editor mounted successfully')
}
```

### 2. Incremental Text Updates

The system uses an intelligent approach to update the editor content:

- **Differential Updates**: Instead of replacing the entire content on each update, the system appends only the new content.
- **Efficient Model Operations**: Uses `model.applyEdits()` for incremental updates rather than `setValue()` when possible.

```typescript
// Compare content length to determine update approach
if (text.length > currentContent.length) {
  // Normal case: we have new content to append
  const newContent = text.slice(currentContent.length)

  // Get the last line position
  const range = model.getFullModelRange()

  // Create an edit operation to append the new content
  const editResult = model.applyEdits([
    {
      range: {
        startLineNumber: range.endLineNumber,
        startColumn: range.endColumn,
        endLineNumber: range.endLineNumber,
        endColumn: range.endColumn,
      },
      text: newContent,
    },
  ])
}
```

### 3. State Machine Integration

- **Dual Update Pattern**: The system updates both the editor and the state machine context.
- **State-Driven UI**: The editor's read-only state is controlled by the state machine.

```typescript
// In onChunk callback
handleStreamedText(text)
send({ type: 'UPDATE_EDITABLE_SCRIPT', script: text })
```

### 4. Automatic Scrolling

- **Reveal Last Line**: The editor automatically scrolls to show the latest content.
- **Multiple Scroll Strategies**: Uses both immediate and delayed scrolling to ensure visibility.

```typescript
// Auto-scroll to bottom when new content is streamed
useEffect(() => {
  const editor = editorRef.current
  if (editor && state.matches('generatingDraft')) {
    const model = editor.getModel()
    if (model) {
      const lineCount = model.getLineCount()

      // Use revealLineInCenter if available for better visibility
      if (typeof editor.revealLineInCenter === 'function') {
        editor.revealLineInCenter(lineCount)
      } else {
        editor.revealLine(lineCount)
      }
    }
  }
}, [state])
```

### 5. Fallback Mechanisms

- **Multiple Update Strategies**: The system has fallbacks for different scenarios:
  - Normal case: Incremental updates with `applyEdits`
  - Edge cases: Full content replacement with `setValue`
  - Error cases: State update with `setStreamedText`

```typescript
// Fallback if there's any error with the editor operations
catch (error) {
  console.error('[STREAMING_DEBUG] Error updating editor, using fallback:', error)
  setStreamedText(text)

  // Try to update the model directly as a last resort
  if (model) {
    try {
      model.setValue(text)
    } catch (err) {
      console.error('[STREAMING_DEBUG] Final fallback failed:', err)
    }
  }
}
```

## Critical Implementation Details

### Streaming Text Handler

The `handleStreamedText` function is the core of the editor update mechanism:

1. It first checks if the editor model is available
2. It compares the incoming text with the current content
3. It chooses the most efficient update strategy:
   - Append new content for normal streaming
   - Replace entire content for edge cases
   - Use fallbacks when errors occur

### Chunk Processing

The `onChunk` callback in the draft generation effect:

1. Updates the state machine with the new text
2. Directly updates the editor via `handleStreamedText`
3. Ensures component is still mounted before processing

```typescript
onChunk: text => {
  if (!isMounted || signal.aborted) return
  console.log('[DRAFT EFFECT] onChunk callback with text length:', text.length)
  handleStreamedText(text)
  send({ type: 'UPDATE_EDITABLE_SCRIPT', script: text })
}
```

### Visual Feedback

The system provides visual feedback during updates:

1. Highlights newly added content with decorations
2. Automatically scrolls to show the latest content
3. Removes decorations after a short delay

## Best Practices

1. **Always Check Editor Availability**: Before attempting to update the editor, verify that both the editor reference and model exist.

2. **Use Incremental Updates**: Prefer appending only new content rather than replacing the entire content when possible.

3. **Provide Multiple Fallbacks**: Implement several update strategies to handle different edge cases.

4. **Synchronize State**: Keep the editor content and state machine context in sync.

5. **Debug Logging**: Include detailed logging to track the flow of text and identify issues.

## Common Issues and Solutions

### Text Not Appearing in Editor

Potential causes and solutions:

1. **Editor Not Initialized**: Ensure the editor reference is properly captured in `handleEditorDidMount`.
2. **Update Method Mismatch**: Verify the correct update method is being used (applyEdits vs setValue).
3. **Missing UI Refresh**: Force UI updates with `requestAnimationFrame` after content changes.
4. **State Synchronization**: Ensure both the editor and state machine are updated with the same content.

### Scrolling Issues

1. **Multiple Scroll Strategies**: Implement both immediate and delayed scrolling.
2. **Force Reveal**: Use `revealLineInCenter` for better visibility.
3. **Delayed Scrolling**: Add a small timeout to ensure content is rendered before scrolling.

## Architecture Recommendations

1. **Clear Update Flow**: Maintain a clear flow from streaming service to editor updates.
2. **State-Driven UI**: Use the state machine to control editor behavior.
3. **Defensive Programming**: Always check for null/undefined before accessing editor methods.
4. **Comprehensive Logging**: Include detailed logs for debugging complex interactions.

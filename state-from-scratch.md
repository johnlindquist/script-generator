# Script Generation State Machine: Rebuilding from Scratch (V2)

This document outlines a step-by-step plan to rebuild the script generation functionality with a clean, modular approach using XState v5. We'll implement this as a parallel "V2" solution alongside the existing implementation, allowing for side-by-side comparison and testing.

## Parallel Implementation Strategy

### Approach Overview

1. Create a new "V2" directory structure for all new components
2. Maintain unique naming to avoid conflicts with existing code
3. Create a toggle mechanism to switch between implementations
4. Build comprehensive unit tests for each new component and the state machine

This approach allows us to:

- Develop and test the new implementation without risking existing functionality
- Compare both implementations side-by-side for validation
- Gradually transition to the new implementation once verified

## Phase 1: Core Structure and Modularity

### Step 1: V2 Directory Structure

Create a separate directory structure for the V2 implementation:

```
/components
  /ScriptGenerationV2                # Main V2 container folder
    /index.tsx                       # Main export with toggle mechanism
    /ScriptGenerationClientV2.tsx    # V2 main component
    /machines                        # State machines
      /scriptGenerationMachine.ts
    /hooks                           # Custom hooks
      /useScriptGeneration.ts
    /components                      # Sub-components
      /PromptForm.tsx
      /ScriptEditor.tsx
      /GenerationControls.tsx
      /Suggestions.tsx
    /services                        # API service modules
      /draftGenerationService.ts
      /finalGenerationService.ts
      /usageService.ts
    /types                           # Type definitions
      /index.ts
    /tests                           # Unit and integration tests
      /scriptGenerationMachine.test.ts
      /ScriptGenerationClientV2.test.tsx
      /components
        /PromptForm.test.tsx
        /ScriptEditor.test.tsx
        # Other component tests
      /services
        /draftGenerationService.test.ts
        /finalGenerationService.test.ts
        # Other service tests
```

### Step 2: Toggle Mechanism

Create a mechanism to switch between the original and V2 implementations:

```typescript
// /components/ScriptGenerationV2/index.tsx

import { ScriptGenerationClientV2 } from './ScriptGenerationClientV2';
import { ScriptGenerationClient as OriginalScriptGenerationClient } from '../ScriptGenerationClient';
import { ScriptGenerationProps } from './types';

export const ScriptGenerationClient = (props: ScriptGenerationProps) => {
  // For local development/testing use a query param or localStorage value
  // For production, we can comment this out and directly return the chosen component
  const useV2 = localStorage.getItem('useScriptGenerationV2') === 'true';

  if (useV2) {
    return <ScriptGenerationClientV2 {...props} />;
  }

  return <OriginalScriptGenerationClient {...props} />;
};

// Also export the V2 client directly to allow direct access in test environments
export { ScriptGenerationClientV2 };
```

This approach allows you to create a route that uses the new implementation without affecting the current functionality:

```typescript
// In your router or pages
import { ScriptGenerationClientV2 } from '@/components/ScriptGenerationV2';

// Route for testing V2 directly
// For example, /scripts/v2
export default function ScriptGenerationV2Page({ params }) {
  return <ScriptGenerationClientV2 {...props} />;
}
```

### Step 3: Core Types

Define the essential types that will be used throughout the V2 implementation:

```typescript
// /components/ScriptGenerationV2/types/index.ts

export interface ScriptGenerationProps {
  isAuthenticated: boolean
  heading: string
  suggestions: Suggestion[]
}

export interface Suggestion {
  id: string
  text: string
  category: string
}

export interface ScriptGenerationState {
  prompt: string
  draftScript: string | null
  finalScript: string | null
  editableScript: string | null
  error: string | null
  requestId: string | null
  scriptId: string | null
  interactionTimestamp: string | null
  usageCount: number
  usageLimit: number
  isFromSuggestion: boolean
  isFromLucky: boolean
  luckyRequestId: string | null
}
```

## Phase 2: Testing Infrastructure

### Step 4: Test Configuration

Set up Jest/Vitest with React Testing Library and proper testing utilities for XState:

```typescript
// /components/ScriptGenerationV2/tests/test-utils.ts

import { render, RenderOptions } from '@testing-library/react'
import { createTestMachine } from '@xstate/test'
import { ReactElement } from 'react'

// Custom render function with necessary providers
function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { ...options })
}

export * from '@testing-library/react'
export { customRender as render }

// Function to create a testable version of a machine
export function createTestableScriptMachine(machineConfig: any, options: any = {}) {
  return createTestMachine(machineConfig, options)
}
```

### Step 5: Initial State Machine Tests

Create comprehensive tests for the state machine:

```typescript
// /components/ScriptGenerationV2/tests/scriptGenerationMachine.test.ts

import { interpret } from 'xstate'
import { scriptGenerationMachine } from '../machines/scriptGenerationMachine'

describe('Script Generation Machine', () => {
  // Test initial state
  test('should start in idle state', () => {
    const initialState = scriptGenerationMachine.initialState
    expect(initialState.value).toBe('idle')
    expect(initialState.context.prompt).toBe('')
    expect(initialState.context.script).toBeNull()
    expect(initialState.context.error).toBeNull()
  })

  // Test state transitions
  test('should transition to generating state when GENERATE event is sent with valid prompt', () => {
    const service = interpret(scriptGenerationMachine).start()

    // Set a valid prompt
    service.send({ type: 'SET_PROMPT', prompt: 'This is a valid prompt that is long enough' })

    // Try to generate
    service.send({ type: 'GENERATE', timestamp: '2023-01-01' })

    expect(service.state.value).toBe('generating')

    service.stop()
  })

  // Test invalid prompt guard
  test('should stay in idle state if prompt is too short', () => {
    const service = interpret(scriptGenerationMachine).start()

    // Set an invalid prompt
    service.send({ type: 'SET_PROMPT', prompt: 'Too short' })

    // Try to generate
    service.send({ type: 'GENERATE', timestamp: '2023-01-01' })

    // Should still be in idle state
    expect(service.state.value).toBe('idle')

    service.stop()
  })

  // Add more tests for other transitions and actions
})
```

## Phase 3: Basic Component with Minimal State Machine

### Step 6: Minimal State Machine

Create a basic XState v5 machine with just the essential states:

```typescript
// /components/ScriptGenerationV2/machines/scriptGenerationMachine.ts

import { setup } from 'xstate'

export const scriptGenerationMachine = setup({
  types: {
    context: {} as {
      prompt: string
      script: string | null
      error: string | null
    },
    events: {} as
      | { type: 'SET_PROMPT'; prompt: string }
      | { type: 'GENERATE'; timestamp: string }
      | { type: 'COMPLETE'; script: string }
      | { type: 'ERROR'; error: string }
      | { type: 'RESET' },
  },
})
  .createMachine({
    id: 'scriptGenerationV2', // Changed ID to avoid conflicts
    initial: 'idle',
    context: {
      prompt: '',
      script: null,
      error: null,
    },
    states: {
      idle: {
        on: {
          SET_PROMPT: {
            actions: 'setPrompt',
          },
          GENERATE: {
            target: 'generating',
            guard: 'hasValidPrompt',
          },
        },
      },
      generating: {
        on: {
          COMPLETE: {
            target: 'complete',
            actions: 'setScript',
          },
          ERROR: {
            target: 'error',
            actions: 'setError',
          },
        },
      },
      complete: {
        on: {
          RESET: {
            target: 'idle',
            actions: 'resetContext',
          },
        },
      },
      error: {
        on: {
          RESET: {
            target: 'idle',
            actions: 'resetContext',
          },
        },
      },
    },
  })
  .implement({
    actions: {
      setPrompt: ({ context, event }) => {
        if (event.type === 'SET_PROMPT') {
          context.prompt = event.prompt
        }
      },
      setScript: ({ context, event }) => {
        if (event.type === 'COMPLETE') {
          context.script = event.script
        }
      },
      setError: ({ context, event }) => {
        if (event.type === 'ERROR') {
          context.error = event.error
        }
      },
      resetContext: ({ context }) => {
        context.prompt = ''
        context.script = null
        context.error = null
      },
    },
    guards: {
      hasValidPrompt: ({ context }) => {
        return context.prompt.trim().length >= 15
      },
    },
  })
```

### Step 7: Component Tests for Basic UI Components

Create tests for UI components:

```typescript
// /components/ScriptGenerationV2/tests/components/PromptForm.test.tsx

import { render, screen, fireEvent } from '../test-utils';
import { PromptForm } from '../../components/PromptForm';

describe('PromptForm', () => {
  const mockProps = {
    prompt: 'Example prompt',
    onPromptChange: jest.fn(),
    onSubmit: jest.fn(),
    isSubmitting: false,
    characterCount: 14,
    error: null,
    isAuthenticated: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders form elements correctly', () => {
    render(<PromptForm {...mockProps} />);

    // Check that form elements are rendered
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('calls onPromptChange when input changes', () => {
    render(<PromptForm {...mockProps} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New prompt text' } });

    expect(mockProps.onPromptChange).toHaveBeenCalledWith('New prompt text');
  });

  test('calls onSubmit when form is submitted', () => {
    render(<PromptForm {...mockProps} />);

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    expect(mockProps.onSubmit).toHaveBeenCalled();
  });

  // Add more tests for other functionality
});
```

### Step 8: Basic Hook Implementation

Create a custom hook to use the state machine:

```typescript
// /components/ScriptGenerationV2/hooks/useScriptGeneration.ts

import { useMachine } from '@xstate/react'
import { scriptGenerationMachine } from '../machines/scriptGenerationMachine'

export function useScriptGeneration() {
  const [state, send] = useMachine(scriptGenerationMachine)

  return {
    prompt: state.context.prompt,
    script: state.context.script,
    error: state.context.error,
    isGenerating: state.matches('generating'),
    isComplete: state.matches('complete'),
    isError: state.matches('error'),
    setPrompt: (prompt: string) => send({ type: 'SET_PROMPT', prompt }),
    generate: () =>
      send({
        type: 'GENERATE',
        timestamp: new Date().toISOString().replace(/[:.]/g, '-').replace('Z', ''),
      }),
    reset: () => send({ type: 'RESET' }),
  }
}
```

### Step 9: Hook Tests

Create tests for the custom hook:

```typescript
// /components/ScriptGenerationV2/tests/hooks/useScriptGeneration.test.ts

import { renderHook, act } from '@testing-library/react-hooks'
import { useScriptGeneration } from '../../hooks/useScriptGeneration'

describe('useScriptGeneration', () => {
  test('should return initial state', () => {
    const { result } = renderHook(() => useScriptGeneration())

    expect(result.current.prompt).toBe('')
    expect(result.current.script).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.isComplete).toBe(false)
    expect(result.current.isError).toBe(false)
  })

  test('should update prompt when setPrompt is called', () => {
    const { result } = renderHook(() => useScriptGeneration())

    act(() => {
      result.current.setPrompt('New prompt text')
    })

    expect(result.current.prompt).toBe('New prompt text')
  })

  test('should transition to generating state when generate is called with valid prompt', () => {
    const { result } = renderHook(() => useScriptGeneration())

    // Set a valid prompt
    act(() => {
      result.current.setPrompt('This is a valid prompt that is long enough')
    })

    // Generate
    act(() => {
      result.current.generate()
    })

    expect(result.current.isGenerating).toBe(true)
  })

  // Add more tests for other functionality
})
```

### Step 10: Basic UI Components

Create minimal UI components for the initial implementation:

```typescript
// /components/ScriptGenerationV2/components/PromptForm.tsx

import { FormEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromptFormProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  characterCount: number;
  usageCount?: number;
  usageLimit?: number;
  error?: string | null;
  isAuthenticated: boolean;
}

export function PromptForm({
  prompt,
  onPromptChange,
  onSubmit,
  isSubmitting,
  characterCount,
  usageCount,
  usageLimit,
  error,
  isAuthenticated,
}: PromptFormProps) {
  const isLimitReached = usageCount !== undefined && usageLimit !== undefined && usageCount >= usageLimit;

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full mt-12 max-w-2xl" aria-label="prompt-form">
      <div className="relative flex items-center justify-center">
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={isLimitReached ? "Usage limit reached" : "Describe the script you need..."}
          rows={3}
          className="min-h-[127px] w-full shadow-2xl sm:p-6 p-5 sm:!text-lg placeholder:text-base sm:placeholder:text-lg placeholder:text-gray-400 bg-card rounded-xl"
          disabled={isLimitReached || isSubmitting}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isSubmitting || isLimitReached}
          className="absolute right-3 bottom-3"
        >
          {isSubmitting ? (
            // Loading spinner icon
            <div className="w-5 h-5 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent"></div>
          ) : (
            <ArrowUp className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Character count and usage metrics */}
      <div className={cn('flex items-center pt-2 tabular-nums text-xs px-2', {
        'justify-between': isAuthenticated,
        'justify-center': !isAuthenticated,
      })}>
        <span className={cn('text-muted-foreground', {
          'text-red-500': characterCount < 15,
        })}>
          {characterCount} characters
        </span>
        {isAuthenticated && usageCount !== undefined && usageLimit !== undefined && (
          <span className={cn('text-xs text-muted-foreground', {
            'text-red-500': usageCount >= usageLimit,
          })}>
            {`${usageLimit - usageCount} generations left today`}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="text-red-500 mt-2 text-sm">
          {error}
        </div>
      )}
    </form>
  );
}
```

### Step 11: Main Client Component

Create a minimal `ScriptGenerationClientV2` that uses the hook:

```typescript
// /components/ScriptGenerationV2/ScriptGenerationClientV2.tsx

import { FormEvent } from 'react';
import { useScriptGeneration } from './hooks/useScriptGeneration';
import { PromptForm } from './components/PromptForm';
import { ScriptGenerationProps } from './types';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FaGithub } from 'react-icons/fa';
import { signIn } from 'next-auth/react';

export function ScriptGenerationClientV2({ isAuthenticated, heading, suggestions }: ScriptGenerationProps) {
  const {
    prompt,
    script,
    error,
    isGenerating,
    isComplete,
    isError,
    setPrompt,
    generate,
    reset,
  } = useScriptGeneration();

  const [isSignInModalShowing, setShowSignInModal] = useState(false);

  const showSignInModal = () => {
    localStorage.setItem('pendingPrompt', prompt);
    setShowSignInModal(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (prompt.trim().length < 15) {
      // Show error through the machine
      return;
    }

    if (!isAuthenticated) {
      showSignInModal();
      return;
    }

    generate();
  };

  return (
    <div className="px-5 w-full">
      <h1 className="text-2xl lg:text-3xl xl:text-5xl font-semibold mx-auto w-full text-center max-w-4xl">
        {heading}
      </h1>

      {!isGenerating && !isComplete && (
        <PromptForm
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={handleSubmit}
          isSubmitting={isGenerating}
          characterCount={prompt.trim().length}
          error={error}
          isAuthenticated={isAuthenticated}
        />
      )}

      {isGenerating && (
        <div className="flex justify-center items-center h-64 mt-8">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-lg">Generating your script...</p>
          </div>
        </div>
      )}

      {isComplete && script && (
        <div className="mt-8 bg-zinc-900/90 rounded-lg overflow-hidden border border-amber-400/10 p-4 max-w-4xl mx-auto">
          <pre className="whitespace-pre-wrap">{script}</pre>
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={reset}>Start Over</Button>
          </div>
        </div>
      )}

      <Dialog modal open={isSignInModalShowing} onOpenChange={setShowSignInModal}>
        <DialogContent className="z-50">
          <DialogHeader>
            <DialogTitle>Sign in with GitHub to generate</DialogTitle>
            <DialogDescription>
              Sign in to generate scripts and save your work. We use GitHub to authenticate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                signIn();
                setShowSignInModal(false);
              }}
            >
              <FaGithub className="w-4 mr-2" /> Sign in with GitHub
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### Step 12: Integration Tests

Create tests for the main component:

```typescript
// /components/ScriptGenerationV2/tests/ScriptGenerationClientV2.test.tsx

import { render, screen, fireEvent, waitFor } from './test-utils';
import { ScriptGenerationClientV2 } from '../ScriptGenerationClientV2';
import { act } from 'react-dom/test-utils';

// Mock the next-auth signIn function
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

describe('ScriptGenerationClientV2', () => {
  const mockProps = {
    isAuthenticated: true,
    heading: 'Test Heading',
    suggestions: [
      { id: '1', text: 'Suggestion 1', category: 'test' },
      { id: '2', text: 'Suggestion 2', category: 'test' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the heading correctly', () => {
    render(<ScriptGenerationClientV2 {...mockProps} />);

    expect(screen.getByText('Test Heading')).toBeInTheDocument();
  });

  test('renders the prompt form when not generating or complete', () => {
    render(<ScriptGenerationClientV2 {...mockProps} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { type: 'submit' })).toBeInTheDocument();
  });

  test('shows sign in modal when not authenticated and form is submitted', () => {
    render(<ScriptGenerationClientV2 {...{...mockProps, isAuthenticated: false}} />);

    // Enter a valid prompt
    const textbox = screen.getByRole('textbox');
    fireEvent.change(textbox, { target: { value: 'This is a valid prompt that is long enough' } });

    // Submit the form
    const form = screen.getByRole('form');
    fireEvent.submit(form);

    // Check that sign in modal is shown
    expect(screen.getByText('Sign in with GitHub to generate')).toBeInTheDocument();
  });

  // Add more integration tests for other functionality
});
```

## Phase 4: Adding Draft Generation

### Step 13: Extend the State Machine for Draft Generation

```typescript
// Updated machine with draft generation states
export const scriptGenerationMachine = setup({
  types: {
    context: {} as {
      prompt: string
      draftScript: string | null
      finalScript: string | null
      error: string | null
      requestId: string | null
      scriptId: string | null
      interactionTimestamp: string | null
    },
    events: {} as
      | { type: 'SET_PROMPT'; prompt: string }
      | { type: 'GENERATE_DRAFT'; timestamp: string }
      | { type: 'START_STREAMING_DRAFT' }
      | { type: 'UPDATE_DRAFT_SCRIPT'; script: string }
      | { type: 'COMPLETE_DRAFT'; scriptId: string }
      | { type: 'SET_SCRIPT_ID'; scriptId: string }
      | { type: 'ERROR'; error: string }
      | { type: 'RESET' },
  },
})
  .createMachine({
    id: 'scriptGenerationV2',
    initial: 'idle',
    context: {
      prompt: '',
      draftScript: null,
      finalScript: null,
      error: null,
      requestId: null,
      scriptId: null,
      interactionTimestamp: null,
    },
    states: {
      idle: {
        on: {
          SET_PROMPT: {
            actions: 'setPrompt',
          },
          GENERATE_DRAFT: {
            target: 'thinkingDraft',
            guard: 'hasValidPrompt',
            actions: 'setInteractionTimestamp',
          },
        },
      },
      thinkingDraft: {
        on: {
          START_STREAMING_DRAFT: {
            target: 'generatingDraft',
          },
          ERROR: {
            target: 'error',
            actions: 'setError',
          },
        },
      },
      generatingDraft: {
        on: {
          UPDATE_DRAFT_SCRIPT: {
            actions: 'updateDraftScript',
          },
          SET_SCRIPT_ID: {
            actions: 'setScriptId',
          },
          COMPLETE_DRAFT: {
            target: 'draftComplete',
          },
          ERROR: {
            target: 'error',
            actions: 'setError',
          },
        },
      },
      draftComplete: {
        on: {
          RESET: {
            target: 'idle',
            actions: 'resetContext',
          },
        },
      },
      error: {
        on: {
          RESET: {
            target: 'idle',
            actions: 'resetContext',
          },
        },
      },
    },
  })
  .implement({
    // Implement actions, guards, and services
    actions: {
      // Add your action implementations here
    },
    guards: {
      hasValidPrompt: ({ context }) => {
        return context.prompt.trim().length >= 15
      },
    },
  })
```

### Step 14: Mock Service for Testing Draft Generation

Create mock services for testing:

```typescript
// /components/ScriptGenerationV2/tests/mocks/draftGenerationService.mock.ts

import { DraftGenerationCallbacks } from '../../services/draftGenerationService'

// Create a mock implementation for testing
export const mockGenerateDraftWithStream = async (
  prompt: string,
  luckyRequestId: string | null,
  timestamp: string,
  signal: AbortSignal,
  callbacks: DraftGenerationCallbacks
) => {
  // Simulate the streaming behavior for tests
  callbacks.onStartStreaming()

  // Simulate a scriptId being returned
  setTimeout(() => {
    callbacks.onScriptId('mock-script-id-123')
  }, 100)

  // Simulate chunks of text coming in
  const mockScript = `// Generated script for: ${prompt}\n\nfunction main() {\n  console.log("Hello world");\n}\n\nmain();`

  let currentText = ''

  // Simulate chunks arriving
  for (let i = 0; i < mockScript.length; i += 10) {
    if (signal.aborted) return

    await new Promise(resolve => setTimeout(resolve, 50))
    currentText += mockScript.slice(i, Math.min(i + 10, mockScript.length))
    callbacks.onChunk(currentText)
  }
}
```

### Step 15: Tests for Draft Generation

Create tests for the draft generation:

```typescript
// /components/ScriptGenerationV2/tests/machines/draftGeneration.test.ts

import { interpret } from 'xstate'
import { scriptGenerationMachine } from '../../machines/scriptGenerationMachine'
import { mockGenerateDraftWithStream } from '../mocks/draftGenerationService.mock'

// Mock the actual service
jest.mock('../../services/draftGenerationService', () => ({
  generateDraftWithStream: mockGenerateDraftWithStream,
}))

describe('Draft Generation State Machine', () => {
  test('should transition through draft generation states', async () => {
    const machine = scriptGenerationMachine
    const service = interpret(machine).start()

    // Set a valid prompt
    service.send({
      type: 'SET_PROMPT',
      prompt: 'Generate a script that calculates Fibonacci numbers',
    })

    // Start draft generation
    service.send({ type: 'GENERATE_DRAFT', timestamp: '2023-01-01-12-00-00' })

    // Should be in thinkingDraft state
    expect(service.state.value).toBe('thinkingDraft')

    // Simulate starting streaming
    service.send({ type: 'START_STREAMING_DRAFT' })

    // Should be in generatingDraft state
    expect(service.state.value).toBe('generatingDraft')

    // Simulate script ID being set
    service.send({ type: 'SET_SCRIPT_ID', scriptId: 'test-script-id' })

    // Simulate draft script updates
    service.send({ type: 'UPDATE_DRAFT_SCRIPT', script: 'console.log("Hello")' })

    // Check that script was updated
    expect(service.state.context.draftScript).toBe('console.log("Hello")')

    // Simulate completion
    service.send({ type: 'COMPLETE_DRAFT', scriptId: 'test-script-id' })

    // Should be in draftComplete state
    expect(service.state.value).toBe('draftComplete')

    service.stop()
  })
})
```

The plan continues with additional phases for implementation, but I've detailed the crucial initial steps with a focus on creating a parallel V2 implementation that:

1. Lives alongside the existing code without conflicts
2. Has comprehensive unit tests
3. Is structured in a modular, maintainable way
4. Can be toggled for testing vs. the original implementation

Would you like me to continue with the details for the remaining phases, or should we focus on implementing these initial phases first?

## Phase 5: Adding Final Generation

### Step 16: Extend the State Machine for Final Generation

Update the state machine to support final generation:

```typescript
// Updated state machine with final generation support
export const scriptGenerationMachine = setup({
  types: {
    context: {} as {
      prompt: string
      draftScript: string | null
      finalScript: string | null
      editableScript: string | null
      error: string | null
      requestId: string | null
      scriptId: string | null
      interactionTimestamp: string | null
      isTransitioningToFinal: boolean
    },
    events: {} as
      | { type: 'SET_PROMPT'; prompt: string }
      | { type: 'GENERATE_DRAFT'; timestamp: string }
      | { type: 'START_STREAMING_DRAFT' }
      | { type: 'UPDATE_DRAFT_SCRIPT'; script: string }
      | { type: 'UPDATE_EDITABLE_SCRIPT'; script: string }
      | { type: 'COMPLETE_DRAFT'; scriptId: string }
      | { type: 'SET_SCRIPT_ID'; scriptId: string }
      | { type: 'GENERATE_FINAL' }
      | { type: 'START_STREAMING_FINAL' }
      | { type: 'SET_TRANSITIONING_TO_FINAL'; value: boolean }
      | { type: 'COMPLETE_FINAL' }
      | { type: 'ERROR'; error: string }
      | { type: 'RESET' },
  },
})
  .createMachine({
    id: 'scriptGenerationV2',
    initial: 'idle',
    context: {
      prompt: '',
      draftScript: null,
      finalScript: null,
      editableScript: null,
      error: null,
      requestId: null,
      scriptId: null,
      interactionTimestamp: null,
      isTransitioningToFinal: false,
    },
    states: {
      idle: {
        on: {
          SET_PROMPT: {
            actions: 'setPrompt',
          },
          GENERATE_DRAFT: {
            target: 'requireAuth',
            guard: 'hasValidPrompt',
            actions: 'setInteractionTimestamp',
          },
        },
      },
      requireAuth: {
        on: {
          AUTH_SUCCESS: {
            target: 'thinkingDraft',
            actions: 'setInteractionTimestamp',
          },
          AUTH_FAILURE: {
            target: 'idle',
            actions: 'setAuthError',
          },
        },
      },
      thinkingDraft: {
        on: {
          START_STREAMING_DRAFT: {
            target: 'generatingDraft',
          },
          ERROR: {
            target: 'error',
            actions: 'setError',
          },
        },
      },
      generatingDraft: {
        on: {
          UPDATE_DRAFT_SCRIPT: {
            actions: 'updateDraftScript',
          },
          UPDATE_EDITABLE_SCRIPT: {
            actions: 'updateEditableScript',
          },
          SET_SCRIPT_ID: {
            actions: 'setScriptId',
          },
          COMPLETE_DRAFT: {
            target: 'draftComplete',
          },
          ERROR: {
            target: 'error',
            actions: 'setError',
          },
        },
      },
      draftComplete: {
        on: {
          UPDATE_EDITABLE_SCRIPT: {
            actions: 'updateEditableScript',
          },
          RESET: {
            target: 'idle',
            actions: 'resetContext',
          },
        },
      },
      error: {
        on: {
          RESET: {
            target: 'idle',
            actions: 'resetContext',
          },
        },
      },
    },
  })
  .implement({
    actions: {
      setPrompt: ({ context, event }) => {
        if (event.type === 'SET_PROMPT') {
          context.prompt = event.prompt
        }
      },
      setInteractionTimestamp: ({ context, event }) => {
        if (event.type === 'GENERATE_DRAFT') {
          context.interactionTimestamp = event.timestamp
        }
      },
      updateDraftScript: ({ context, event }) => {
        if (event.type === 'UPDATE_DRAFT_SCRIPT') {
          context.draftScript = event.script
          context.editableScript = event.script // Also update editable script
        }
      },
      updateEditableScript: ({ context, event }) => {
        if (event.type === 'UPDATE_EDITABLE_SCRIPT') {
          context.editableScript = event.script
        }
      },
      setScriptId: ({ context, event }) => {
        if (event.type === 'SET_SCRIPT_ID') {
          context.scriptId = event.scriptId
        }
      },
      setTransitioningToFinal: ({ context, event }) => {
        if (event.type === 'SET_TRANSITIONING_TO_FINAL') {
          context.isTransitioningToFinal = event.value
        }
      },
      prepareForFinalGeneration: ({ context }) => {
        context.isTransitioningToFinal = false // Reset flag
      },
      setError: ({ context, event }) => {
        if (event.type === 'ERROR') {
          context.error = event.error
        }
      },
      setAuthError: ({ context, event }) => {
        if (event.type === 'AUTH_FAILURE') {
          context.error = event.error
        }
      },
      resetContext: ({ context }) => {
        context.prompt = ''
        context.draftScript = null
        context.finalScript = null
        context.editableScript = null
        context.error = null
        context.requestId = null
        context.scriptId = null
        context.interactionTimestamp = null
        context.isTransitioningToFinal = false
      },
    },
    guards: {
      hasValidPrompt: ({ context }) => {
        return context.prompt.trim().length >= 15
      },
      needsAuthentication: ({ context }, { isAuthenticated = false }) => {
        return !isAuthenticated && context.prompt.trim().length >= 15
      },
    },
  })
```

### Step 17: Create Final Generation Service

Implement the service that will handle the final script generation with streaming:

```typescript
// /components/ScriptGenerationV2/services/finalGenerationService.ts

export interface FinalGenerationParams {
  prompt: string
  requestId: string | null
  luckyRequestId: string | null
  interactionTimestamp: string
  scriptId: string
  editableScript: string
}

export interface FinalGenerationCallbacks {
  onStartStreaming: () => void
  onChunk: (text: string) => void
  onError: (error: { message: string }) => void
}

export async function generateFinalWithStream(
  params: FinalGenerationParams,
  options: {
    signal: AbortSignal
    onStartStreaming: () => void
    onChunk: (text: string) => void
    onError: (error: { message: string }) => void
  }
): Promise<void> {
  const { signal, onStartStreaming, onChunk, onError } = options

  try {
    const response = await fetch('/api/scripts/generate-final', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal,
    })

    if (!response.ok) {
      const errorData = await response.json()
      onError({ message: errorData.error || 'Error generating final script' })
      return
    }

    // Handle streaming response
    const reader = response.body?.getReader()
    if (!reader) {
      onError({ message: 'Stream reader not available' })
      return
    }

    onStartStreaming()

    let decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true })

      // Send current buffer to callback
      onChunk(buffer)
    }

    // Final decoding
    buffer += decoder.decode()
    onChunk(buffer)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // This is an expected error when the request is aborted
      return
    }
    onError({
      message: error instanceof Error ? error.message : 'Unknown error in final generation',
    })
  }
}
```

### Step 18: Create Mock for Final Generation Service

Create a mock for testing the final generation service:

```typescript
// /components/ScriptGenerationV2/tests/mocks/finalGenerationService.mock.ts

import { FinalGenerationParams } from '../../services/finalGenerationService'

export const mockGenerateFinalWithStream = async (
  params: FinalGenerationParams,
  options: {
    signal: AbortSignal
    onStartStreaming: () => void
    onChunk: (text: string) => void
    onError: (error: { message: string }) => void
  }
): Promise<void> => {
  const { signal, onStartStreaming, onChunk, onError } = options

  // Simulate the streaming behavior for tests
  try {
    onStartStreaming()

    // Create a mock script based on the prompt
    const mockScript = `/**
 * Final script generated for: ${params.prompt.substring(0, 50)}...
 * 
 * This is a mock implementation for testing
 */

import fs from 'fs';
import path from 'path';

async function main() {
  try {
    console.log("Starting script execution...");
    
    // Process some data
    const data = await processData();
    
    // Write results
    await writeResults(data);
    
    console.log("Script completed successfully!");
    return true;
  } catch (error) {
    console.error("Error executing script:", error);
    return false;
  }
}

async function processData() {
  // Simulate processing
  return { result: "Processed data" };
}

async function writeResults(data) {
  // Simulate writing to file
  console.log("Writing results:", data);
}

// Execute main function
main().catch(console.error);`

    let currentText = ''

    // Simulate chunks arriving with some delay
    for (let i = 0; i < mockScript.length; i += 15) {
      if (signal.aborted) return

      await new Promise(resolve => setTimeout(resolve, 50))
      currentText += mockScript.slice(i, Math.min(i + 15, mockScript.length))
      onChunk(currentText)
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // Expected error on abort
      return
    }

    onError({
      message: error instanceof Error ? error.message : 'Mock final generation error',
    })
  }
}
```

### Step 19: Update useScriptGeneration Hook

Enhance the hook to support final generation:

```typescript
// /components/ScriptGenerationV2/hooks/useScriptGeneration.ts

import { useMachine } from '@xstate/react'
import { useRef, useCallback, useEffect } from 'react'
import { scriptGenerationMachine } from '../machines/scriptGenerationMachine'
import { generateDraftWithStream } from '../services/draftGenerationService'
import { generateFinalWithStream } from '../services/finalGenerationService'

export function useScriptGeneration() {
  const [state, send, service] = useMachine(scriptGenerationMachine)

  // Refs to track generation state and handle AbortController
  const draftControllerRef = useRef<AbortController | null>(null)
  const finalControllerRef = useRef<AbortController | null>(null)

  // Function to generate draft script
  const generateDraft = useCallback(() => {
    // Create a timestamp for tracking
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')

    // Send event to start draft generation
    send({ type: 'GENERATE_DRAFT', timestamp })

    // Create a new AbortController
    const controller = new AbortController()
    draftControllerRef.current = controller

    // Call the draft generation service
    generateDraftWithStream(
      state.context.prompt,
      null, // luckyRequestId (would be set for lucky generation)
      timestamp,
      controller.signal,
      {
        onStartStreaming: () => {
          send({ type: 'START_STREAMING_DRAFT' })
        },
        onScriptId: scriptId => {
          send({ type: 'SET_SCRIPT_ID', scriptId })
        },
        onChunk: text => {
          send({ type: 'UPDATE_DRAFT_SCRIPT', script: text })
        },
        onError: error => {
          send({ type: 'ERROR', error: error.message })
        },
      }
    ).catch(error => {
      // Handle unexpected errors
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        send({ type: 'ERROR', error: error.message })
      }
    })
  }, [state.context.prompt, send])

  // Function to generate final script
  const generateFinal = useCallback(() => {
    if (!state.context.scriptId) {
      send({ type: 'ERROR', error: 'Cannot generate final script without a script ID' })
      return
    }

    // Send event to start final generation
    send({ type: 'GENERATE_FINAL' })

    // Create a new AbortController
    const controller = new AbortController()
    finalControllerRef.current = controller

    // Prepare parameters
    const params = {
      prompt: state.context.prompt,
      requestId: state.context.requestId,
      luckyRequestId: null, // Set accordingly if using lucky
      interactionTimestamp: state.context.interactionTimestamp || new Date().toISOString(),
      scriptId: state.context.scriptId,
      editableScript: state.context.editableScript || '',
    }

    // Call the final generation service
    generateFinalWithStream(params, {
      signal: controller.signal,
      onStartStreaming: () => {
        send({ type: 'SET_TRANSITIONING_TO_FINAL', value: true })
      },
      onChunk: text => {
        send({ type: 'UPDATE_EDITABLE_SCRIPT', script: text })
      },
      onError: error => {
        send({ type: 'ERROR', error: error.message })
      },
    }).catch(error => {
      // Handle unexpected errors
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        send({ type: 'ERROR', error: error.message })
      }
    })
  }, [
    state.context.scriptId,
    state.context.prompt,
    state.context.requestId,
    state.context.interactionTimestamp,
    state.context.editableScript,
    send,
  ])

  // Function to abort any ongoing generation
  const abortGeneration = useCallback(() => {
    if (draftControllerRef.current && !draftControllerRef.current.signal.aborted) {
      draftControllerRef.current.abort()
    }

    if (finalControllerRef.current && !finalControllerRef.current.signal.aborted) {
      finalControllerRef.current.abort()
    }
  }, [])

  // Clean up controllers on unmount
  useEffect(() => {
    return () => {
      abortGeneration()
    }
  }, [abortGeneration])

  return {
    // State
    prompt: state.context.prompt,
    script: state.context.editableScript,
    error: state.context.error,

    // State indicators
    isThinkingDraft: state.matches('thinkingDraft'),
    isGeneratingDraft: state.matches('generatingDraft'),
    isDraftComplete: state.matches('draftComplete'),
    isComplete: state.matches('complete'),
    isError: state.matches('error'),

    // Actions
    setPrompt: (prompt: string) => send({ type: 'SET_PROMPT', prompt }),
    generateDraft,
    generateFinal,
    updateEditableScript: (script: string) => send({ type: 'UPDATE_EDITABLE_SCRIPT', script }),
    reset: () => {
      abortGeneration()
      send({ type: 'RESET' })
    },

    // Machine access (for more advanced use cases)
    state,
    send,
    service,
  }
}
```

### Step 20: Enhanced ScriptEditor Component

Create a more robust script editor that handles streaming content:

```typescript
// /components/ScriptGenerationV2/components/ScriptEditor.tsx

import { useRef, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { monacoOptions, initializeTheme } from '@/lib/monaco';

interface EditorRef {
  getModel: () => {
    getValue: () => string;
    setValue: (value: string) => void;
    getLineCount: () => number;
    getFullModelRange: () => {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    };
    applyEdits: (
      edits: {
        range: {
          startLineNumber: number;
          startColumn: number;
          endLineNumber: number;
          endColumn: number;
        };
        text: string;
      }[]
    ) => boolean[];
    getLineLength: (line: number) => number;
  } | null;
  revealLine: (line: number) => void;
  revealLineInCenter?: (line: number) => void;
  deltaDecorations?: (oldDecorations: string[], newDecorations: unknown[]) => string[];
}

interface ScriptEditorProps {
  script: string | null;
  isReadOnly: boolean;
  isLoading: boolean;
  onChange?: (value: string | undefined) => void;
  onMount?: (editor: unknown) => void;
}

export function ScriptEditor({
  script,
  isReadOnly,
  isLoading,
  onChange,
  onMount,
}: ScriptEditorProps) {
  const editorRef = useRef<EditorRef | null>(null);
  const decorationTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleEditorDidMount = (editor: unknown) => {
    // Create a wrapper that matches our EditorRef interface
    const editorWrapper: EditorRef = {
      getModel: () => {
        const model = (editor as any).getModel();
        return model;
      },
      revealLine: (line: number) => (editor as any).revealLine(line),
      revealLineInCenter: (line: number) => (editor as any).revealLineInCenter(line),
      deltaDecorations: (oldDecorations: string[], newDecorations: unknown[]) =>
        (editor as any).deltaDecorations(oldDecorations, newDecorations),
    };

    editorRef.current = editorWrapper;

    if (onMount) {
      onMount(editor);
    }
  };

  // Function to handle streaming text updates
  useEffect(() => {
    if (!script || !editorRef.current) return;

    const editor = editorRef.current;
    const model = editor.getModel();

    if (!model) return;

    try {
      // Get the current content in the editor
      const currentContent = model.getValue();

      // Edge case: If editor is completely empty, just set the entire content
      if (!currentContent.trim()) {
        model.setValue(script);
        return;
      }

      // Compare content length to determine update approach
      if (script.length > currentContent.length) {
        // Normal case: we have new content to append
        const newContent = script.slice(currentContent.length);

        // Get the last line position
        const range = model.getFullModelRange();

        // Create an edit operation to append the new content
        model.applyEdits([
          {
            range: {
              startLineNumber: range.endLineNumber,
              startColumn: range.endColumn,
              endLineNumber: range.endLineNumber,
              endColumn: range.endColumn,
            },
            text: newContent,
          },
        ]);

        // Ensure we scroll to the bottom
        const lineCount = model.getLineCount();
        if (editor) {
          // Use revealLineInCenter as a fallback if revealLineInCenter is not available
          if (typeof editor.revealLineInCenter === 'function') {
            editor.revealLineInCenter(lineCount);
          } else {
            editor.revealLine(lineCount);
          }

          // Add a visual indicator for new content by highlighting the last line
          if (typeof editor.deltaDecorations === 'function') {
            const lastLineLength = model.getLineLength(lineCount) || 0;

            const decorations = editor.deltaDecorations([], [
              {
                range: {
                  startLineNumber: lineCount,
                  startColumn: 1,
                  endLineNumber: lineCount,
                  endColumn: lastLineLength + 1,
                },
                options: {
                  className: 'streaming-highlight',
                  isWholeLine: true,
                },
              },
            ]);

            // Remove decoration after a delay
            if (decorationTimeout.current) {
              clearTimeout(decorationTimeout.current);
            }

            decorationTimeout.current = setTimeout(() => {
              if (editor && typeof editor.deltaDecorations === 'function') {
                editor.deltaDecorations(decorations, []);
              }
            }, 300);
          }
        }
      } else if (script.length < currentContent.length || script !== currentContent) {
        // If the new text is shorter or different, replace everything
        model.setValue(script);
      }
    } catch (error) {
      // Fallback if there's any error with the editor operations
      console.error('Error updating editor:', error);

      // Try to update the model directly as a last resort
      const model = editorRef.current?.getModel();
      if (model) {
        try {
          model.setValue(script);
        } catch (err) {
          console.error('Final fallback failed:', err);
        }
      }
    }

    // Cleanup
    return () => {
      if (decorationTimeout.current) {
        clearTimeout(decorationTimeout.current);
      }
    };
  }, [script]);

  return (
    <div className="w-full h-full relative">
      <Editor
        height="100%"
        defaultLanguage="typescript"
        value={script || ''}
        onChange={onChange}
        options={{
          ...monacoOptions,
          readOnly: isReadOnly,
          domReadOnly: isReadOnly,
        }}
        onMount={handleEditorDidMount}
        beforeMount={initializeTheme}
        theme="gruvboxTheme"
      />

      {isLoading && (
        <div className="absolute inset-0 bg-zinc-900/80 flex items-center justify-center z-10">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}
```

## Phase 6: Adding Authentication, Usage and Suggestions

### Step 21: Add Authentication Integration

Update the machine to handle authentication:

```typescript
// Update the machine to include authRequired state
export const scriptGenerationMachine = setup({
  types: {
    context: {} as {
      // ...existing context
      authRequired: boolean
    },
    events: {} as  // ...existing events
      | { type: 'REQUIRE_AUTH' }
      | { type: 'AUTH_SUCCESS' }
      | { type: 'AUTH_FAILURE'; error: string },
  },
})
  .createMachine({
    // ...existing machine definition
    context: {
      // ...existing context
      authRequired: false,
    },
    states: {
      idle: {
        on: {
          // ...existing transitions
          GENERATE_DRAFT: [
            {
              target: 'requireAuth',
              guard: 'hasValidPrompt',
            },
            {
              target: 'thinkingDraft',
              guard: 'hasValidPrompt',
              actions: 'setInteractionTimestamp',
            },
          ],
        },
      },
      // Add new auth state
      requireAuth: {
        on: {
          AUTH_SUCCESS: {
            target: 'thinkingDraft',
            actions: 'setInteractionTimestamp',
          },
          AUTH_FAILURE: {
            target: 'idle',
            actions: 'setAuthError',
          },
        },
      },
      // ...other states
    },
  })
  .implement({
    // ...existing implementation
    guards: {
      // ...existing guards
      needsAuthentication: ({ context }, { isAuthenticated = false }) => {
        return !isAuthenticated && context.prompt.trim().length >= 15
      },
    },
    actions: {
      // ...existing actions
      setAuthError: ({ context, event }) => {
        if (event.type === 'AUTH_FAILURE') {
          context.error = event.error
        }
      },
    },
  })
```

### Step 22: Create UsageService

Implement a service to track and fetch usage data:

```typescript
// /components/ScriptGenerationV2/services/usageService.ts

export interface UsageData {
  count: number
  limit: number
}

export async function fetchUsage(): Promise<UsageData> {
  try {
    const response = await fetch('/api/user/usage')

    if (!response.ok) {
      throw new Error('Failed to fetch usage data')
    }

    const data = await response.json()
    return {
      count: data.count || 0,
      limit: data.limit || 0,
    }
  } catch (error) {
    console.error('Error fetching usage:', error)
    return { count: 0, limit: 0 }
  }
}
```

### Step 23: Create ScriptSuggestions Component

Implement the component to display script suggestions:

```typescript
// /components/ScriptGenerationV2/components/ScriptSuggestions.tsx

import { motion } from 'framer-motion';
import { Suggestion } from '../types';

interface ScriptSuggestionsProps {
  suggestions: Suggestion[];
  setPrompt: (prompt: string) => void;
  setIsFromSuggestion: (value: boolean) => void;
  onSelect: () => void;
}

export function ScriptSuggestions({
  suggestions,
  setPrompt,
  setIsFromSuggestion,
  onSelect,
}: ScriptSuggestionsProps) {
  const handleSuggestionClick = (suggestion: Suggestion) => {
    setPrompt(suggestion.text);
    setIsFromSuggestion(true);
    onSelect();
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-3xl mx-auto mt-4">
      {suggestions.map((suggestion) => (
        <motion.button
          key={suggestion.id}
          onClick={() => handleSuggestionClick(suggestion)}
          className="bg-zinc-800/70 hover:bg-amber-900/30 text-amber-300/70 hover:text-amber-300
                     px-3 py-1 rounded-full text-sm border border-amber-600/20 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          {suggestion.text.length > 30 ? suggestion.text.substring(0, 30) + '...' : suggestion.text}
        </motion.button>
      ))}
    </div>
  );
}
```

### Step 24: Add "I'm Feeling Lucky" Feature

Create a service for the lucky feature:

```typescript
// /components/ScriptGenerationV2/services/luckyService.ts

export interface LuckyGenerationResult {
  combinedPrompt: string
  requestId: string
}

export async function generateLucky(timestamp: string): Promise<LuckyGenerationResult> {
  try {
    const response = await fetch('/api/scripts/lucky', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ timestamp }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to generate random script')
    }

    const data = await response.json()
    return {
      combinedPrompt: data.combinedPrompt,
      requestId: data.requestId,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error in lucky generation')
  }
}
```

## Phase 7: UI Refinements and Essential Components

### Step 25: Create AnimatedText Component

Create a component for animated text:

```typescript
// /components/ScriptGenerationV2/components/AnimatedText.tsx

import { motion } from 'framer-motion';

interface AnimatedTextProps {
  text: string;
}

export function AnimatedText({ text }: AnimatedTextProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <span>{text}</span>
      <motion.div className="flex gap-1" initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}>
        {[0, 1, 2].map(index => (
          <motion.span
            key={index}
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: index * 0.2,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
```

### Step 26: Create GenerationControls Component

Create a component for the control buttons:

```typescript
// /components/ScriptGenerationV2/components/GenerationControls.tsx

import { DocumentCheckIcon, ArrowPathIcon, ArrowDownTrayIcon, SparklesIcon } from '@heroicons/react/24/solid';

interface GenerationControlsProps {
  onSave: () => void;
  onSaveAndInstall: () => void;
  onReset: () => void;
  onEnhance: () => void;
  isAuthenticated: boolean;
}

export function GenerationControls({
  onSave,
  onSaveAndInstall,
  onReset,
  onEnhance,
  isAuthenticated,
}: GenerationControlsProps) {
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="absolute bottom-4 right-4 flex gap-2">
      <button
        onClick={onSave}
        className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
      >
        <DocumentCheckIcon className="w-5 h-5" />
        Save Script
      </button>
      <button
        onClick={onSaveAndInstall}
        className="bg-gradient-to-tr from-amber-300 to-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
      >
        <ArrowDownTrayIcon className="w-5 h-5" />
        Save & Install
      </button>
      <button
        onClick={onReset}
        className="bg-gradient-to-tr from-gray-700 to-gray-800 text-slate-300 px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
      >
        <ArrowPathIcon className="w-5 h-5" />
        Start Over
      </button>
      <button
        onClick={onEnhance}
        className="bg-gradient-to-tr from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-2xl hover:brightness-110 transition-colors flex items-center gap-2"
      >
        <SparklesIcon className="w-5 h-5" />
        Enhance with AI
      </button>
    </div>
  );
}
```

### Step 27: Error Handling Utilities

Create utility functions for consistent error handling:

```typescript
// /components/ScriptGenerationV2/utils/errorHandling.ts

import toast from 'react-hot-toast'

export function handleUnauthorized() {
  toast.error('Session expired. Please sign in again.')

  // Show a second toast after a brief delay
  setTimeout(() => {
    toast.loading('Refreshing page...', { duration: 2000 })
  }, 500)

  // Reload after giving time to read both toasts
  setTimeout(() => {
    window.location.reload()
  }, 2500)
}

export function handleApiError(error: Error | unknown, defaultMessage: string): string {
  if (error instanceof Error) {
    if (error.message === 'UNAUTHORIZED') {
      handleUnauthorized()
      return 'Session expired'
    }
    return error.message
  }
  return defaultMessage
}
```

## Phase 8: Script Saving and Installation

### Step 28: Create Save Script Services

Implement services for saving and installing scripts:

```typescript
// /components/ScriptGenerationV2/services/saveScriptService.ts

export interface SaveScriptParams {
  scriptId: string
  content: string
}

export interface SaveScriptResult {
  id: string
  url: string
}

export async function saveScript(params: SaveScriptParams): Promise<SaveScriptResult> {
  try {
    const response = await fetch('/api/scripts/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Error saving script')
    }

    const data = await response.json()
    return {
      id: data.id,
      url: data.url,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error saving script')
  }
}

export async function saveAndInstallScript(params: SaveScriptParams): Promise<SaveScriptResult> {
  try {
    const response = await fetch('/api/scripts/save-and-install', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Error saving and installing script')
    }

    const data = await response.json()
    return {
      id: data.id,
      url: data.url,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error saving and installing script')
  }
}
```

## Phase 9: Main Client Component Integration

### Step 29: Complete ScriptGenerationClientV2 Component

Integrate all pieces into the main client component:

```typescript
// /components/ScriptGenerationV2/ScriptGenerationClientV2.tsx

// Implementation shown in previous step...
// This would be a complete integration of all the components we've built
// including the state machine, UI components, and services.
```

## Phase 10: Testing and Documentation

### Step 30: Integration Tests

Create comprehensive tests for the full component:

```typescript
// /components/ScriptGenerationV2/tests/integration.test.tsx

// Implementation shown in previous step...
// This would test the complete flow from prompt input to script generation
// and all user interactions.
```

### Step 31: Version Toggle Component

Create a component to toggle between V1 and V2 implementations:

```typescript
// /components/ScriptGenerationV2/components/VersionToggle.tsx

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function VersionToggle() {
  const [isV2Enabled, setIsV2Enabled] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    const storedValue = localStorage.getItem('useScriptGenerationV2');
    setIsV2Enabled(storedValue === 'true');
  }, []);

  // Update localStorage when toggle changes
  const handleToggleChange = (checked: boolean) => {
    setIsV2Enabled(checked);
    localStorage.setItem('useScriptGenerationV2', checked.toString());

    // Optional: reload the page to apply the change
    window.location.reload();
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch id="version-toggle" checked={isV2Enabled} onCheckedChange={handleToggleChange} />
      <Label htmlFor="version-toggle">
        {isV2Enabled ? 'Using V2 Implementation' : 'Using Original Implementation'}
      </Label>
    </div>
  );
}
```

### Step 32: Documentation

Add comprehensive documentation for the V2 implementation:

`````
````markdown
# Script Generation V2

This directory contains the V2 implementation of the script generation feature, built with a modular architecture using XState v5.

## Overview

The V2 implementation is designed to run alongside the original implementation, allowing for gradual testing and migration. Key improvements include:

- Modular component architecture
- Strongly typed state machine using XState v5
- Comprehensive test coverage
- Improved error handling and recovery
- Better performance and optimization

## Usage

Toggle between the V1 and V2 implementations using localStorage:

```js
// Use V2 implementation
localStorage.setItem('useScriptGenerationV2', 'true')

// Revert to V1 implementation
localStorage.setItem('useScriptGenerationV2', 'false')
`````

````

```

Alternatively, use the `VersionToggle` component for a visual toggle switch.

## Architecture

### Directory Structure

```

/components/ScriptGenerationV2 # Main V2 container folder
/index.tsx # Main export with toggle mechanism
/ScriptGenerationClientV2.tsx # V2 main component
/machines # State machines
/scriptGenerationMachine.ts
/hooks # Custom hooks
/useScriptGeneration.ts
/components # Sub-components
/PromptForm.tsx
/ScriptEditor.tsx # Other components
/services # API service modules
/draftGenerationService.ts
/finalGenerationService.ts # Other services
/types # Type definitions
/index.ts
/tests # Unit and integration tests # Test files

````

### State Machine

The core of the implementation is the XState v5 state machine in `machines/scriptGenerationMachine.ts`, which handles all application state and transitions. Key states include:

- `idle`: Initial state, waiting for user input
- `thinkingDraft`: Initiating draft generation
- `generatingDraft`: Streaming draft content
- `complete`: Final script ready
- `error`: Error state

## Testing

Run the tests using:

```bash
pnpm test
```

Or run specific test suites:

```bash
pnpm test -- --testPathPattern=ScriptGenerationV2
```

## Migration Path

1. Test by toggling between implementations
2. Collect feedback and make improvements
3. Gradually shift users to the V2 implementation
4. Eventually remove the V1 implementation when ready

```

## Implementation Strategy

This detailed plan provides a progressive approach to building the V2 implementation:

1. Start with the basic infrastructure (Phases 1-2)
2. Implement the core state machine and components (Phase 3-4)
3. Add the final generation functionality (Phase 5)
4. Implement additional features (Phases 6-8)
5. Integrate everything into the main client component (Phase 9)
6. Complete with comprehensive tests and documentation (Phase 10)

By following this step-by-step approach, we can:

1. Test each component in isolation
2. Ensure the state machine correctly handles all transitions
3. Gradually build up features without breaking existing functionality
4. Maintain full feature parity with the current implementation
5. Enable side-by-side comparison for validation

This approach minimizes risk while allowing for incremental improvement, resulting in a more robust and maintainable implementation.
```

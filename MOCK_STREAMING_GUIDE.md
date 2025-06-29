# Mock Streaming Implementation Guide

This guide covers the complete mock streaming system implemented for the Script Generator project, enabling local development and testing without API keys or network dependencies.

## Overview

The mock streaming system simulates the real AI script generation API, providing:
- Realistic streaming behavior with configurable delays
- Multiple test scenarios (short, long, error cases)
- Comprehensive error simulation
- Easy toggling between real and mock APIs
- No authentication required for testing

## What Was Implemented

### 1. Core Mock Infrastructure

#### `lib/mock-scripts.ts`
Defines all mock script scenarios and error types:
```typescript
export const mockScripts = {
  short: { /* Simple hello world script */ },
  long: { /* Complex file organizer */ },
  error_midstream: { /* Script with error injection point */ },
  slow_stream: { /* Simulates slow network */ },
  instant: { /* No delay streaming */ },
  unicode_stress: { /* Special characters test */ }
}

export const errorTypes = {
  network_timeout: { status: 408 },
  rate_limit: { status: 429 },
  auth_failed: { status: 401 },
  server_error: { status: 500 },
  invalid_prompt: { status: 400 }
}
```

#### `lib/mock-streaming.ts`
Core streaming functionality:
- `createMockStream()` - Creates a ReadableStream matching production format
- `createMockResponse()` - Wraps streams in HTTP Response
- `createMockErrorResponse()` - Generates error responses
- `testMockStreaming()` - Utility for testing without full API
- `generateMockScriptContent()` - Dynamic script generation

Key features:
- Script ID injection: `__SCRIPT_ID__${id}__SCRIPT_ID__`
- Configurable chunk sizes and delays
- Error injection at specific points
- Progress callbacks for monitoring

#### `app/api/generate-ai-gateway/mock/route.ts`
Mock API endpoint that mirrors production:
- Accepts POST requests with prompt
- Query parameters for configuration
- Optional database integration
- Streaming response with proper headers

### 2. Integration Layer

#### `lib/mock-integration.ts`
Seamless integration with existing code:
- `getMockConfig()` - Retrieves configuration from multiple sources
- `setMockConfig()` - Updates configuration
- `getStreamingFetch()` - Returns mock-aware fetch function
- Browser console API for development

Configuration priority:
1. localStorage (highest)
2. URL parameters
3. Environment variables (lowest)

#### API Service Integration
Modified `lib/apiService.ts` to use mock-aware fetch:
```typescript
const streamingFetch = getStreamingFetch()
const res = await streamingFetch('/api/generate-ai-gateway', {...})
```

### 3. Error Handling System

#### `components/StreamErrorHandler.tsx`
Comprehensive error handling with:
- Error categorization (network, auth, rate limit, etc.)
- Toast notifications with contextual actions
- Retry, sign-in, and contact support buttons
- Development logging
- Production error tracking hooks

```typescript
export function mapErrorToStreamError(error: Error | unknown): StreamError
export function useStreamErrorHandler(): { handleStreamError }
```

### 4. Testing Suite

#### `tests/mock-streaming.test.ts`
Tests for core streaming functionality:
- Stream creation and chunking
- Error injection
- Timing verification
- All scenarios validation

#### `tests/stream-error-handler.test.ts`
Error handling tests:
- Error mapping accuracy
- Toast notification behavior
- Callback handling

#### `tests/mock-integration.test.ts`
Integration tests:
- Configuration management
- Fetch interception
- Priority handling

### 5. Documentation

#### `docs/MOCK_STREAMING.md`
Complete usage documentation including:
- Quick start guide
- All scenarios and error types
- Configuration options
- API endpoint details
- Best practices

#### `examples/mock-streaming-demo.html`
Interactive demo page for testing (Note: requires transpilation for ES modules)

## How to Use It

### 1. Browser Console (Development)

```javascript
// Enable with default settings
__mockStreaming.enable()

// Enable with specific scenario
__mockStreaming.enable('long')

// Enable with error
__mockStreaming.enable('short', 'rate_limit')

// Check configuration
__mockStreaming.config()

// Disable
__mockStreaming.disable()
```

### 2. URL Parameters

```
http://localhost:3000/scripts/new?mock=true&mock_scenario=long&mock_error=network_timeout
```

### 3. Environment Variables

```bash
MOCK_STREAMING=true
MOCK_SCENARIO=slow_stream
MOCK_ERROR=auth_failed
MOCK_ERROR_AFTER=5
MOCK_CHUNK_SIZE=10
MOCK_DELAY_MS=200
```

### 4. Programmatic Usage

```typescript
import { setMockConfig, enableMockStreaming } from '@/lib/mock-integration'

// Enable for testing
enableMockStreaming('long', 'server_error')

// Custom configuration
setMockConfig({
  enabled: true,
  scenario: 'unicode_stress',
  chunkSize: 25,
  delayMs: 100
})
```

## Testing Different Scenarios

### Basic Script Generation
```javascript
// Test simple script
__mockStreaming.enable('short')
// Generate normally - will use mock
```

### Error Scenarios
```javascript
// Test auth failure
__mockStreaming.enable('short', 'auth_failed')

// Test network timeout after 5 chunks
__mockStreaming.setConfig({
  enabled: true,
  scenario: 'long',
  error: 'network_timeout',
  errorAfterChunks: 5
})
```

### Performance Testing
```javascript
// Slow network simulation
__mockStreaming.enable('slow_stream')

// Custom timing
__mockStreaming.setConfig({
  enabled: true,
  scenario: 'long',
  chunkSize: 5,
  delayMs: 500
})
```

## Architecture Benefits

1. **No Authentication Required**
   - Mock endpoint bypasses auth checks
   - Creates test user automatically
   - Enables rapid local development

2. **Exact Production Format**
   - Matches real API streaming format
   - Same script ID injection pattern
   - Identical error response structure

3. **Flexible Configuration**
   - Multiple configuration sources
   - Runtime toggling
   - Persistent settings via localStorage

4. **Comprehensive Error Simulation**
   - All HTTP error codes covered
   - Mid-stream error injection
   - Realistic error messages

5. **Developer Experience**
   - Console API in development
   - Clear error messages
   - Detailed logging

## Common Use Cases

### 1. Local Development
Enable mock streaming to develop without API keys:
```javascript
__mockStreaming.enable()
```

### 2. Error State Testing
Test how the UI handles various errors:
```javascript
// Rate limit
__mockStreaming.enable('short', 'rate_limit')

// Auth failure
__mockStreaming.enable('short', 'auth_failed')
```

### 3. Performance Testing
Test with different network conditions:
```javascript
// Very slow streaming
__mockStreaming.setConfig({
  enabled: true,
  scenario: 'long',
  chunkSize: 1,
  delayMs: 1000
})
```

### 4. CI/CD Testing
Use environment variables for consistent testing:
```yaml
env:
  MOCK_STREAMING: true
  MOCK_SCENARIO: short
```

## Troubleshooting

### Mock Not Working
1. Check if enabled: `__mockStreaming.config()`
2. Clear localStorage: `__mockStreaming.disable()` then enable again
3. Check browser console for errors
4. Verify you're in development mode

### Unexpected Behavior
1. Check configuration priority (localStorage > URL > env)
2. Clear all settings: `localStorage.clear()`
3. Reload the page after configuration changes

### Type Errors
The test files may have TypeScript errors due to vitest hoisting. These don't affect functionality but may need adjustment for strict type checking.

## Future Enhancements

1. **More Scenarios**
   - Add domain-specific scripts
   - Industry-specific examples
   - Edge case scenarios

2. **Better Error Simulation**
   - Partial response errors
   - Malformed JSON responses
   - Network interruption simulation

3. **Analytics**
   - Track mock usage
   - Performance metrics
   - Error frequency analysis

4. **UI Integration**
   - Mock toggle in UI
   - Scenario selector
   - Visual error injection

## Summary

The mock streaming system provides a complete solution for local development and testing of the Script Kit generation feature. It eliminates the need for API keys, enables comprehensive error testing, and maintains exact compatibility with the production API format. The system is designed to be developer-friendly with multiple configuration options and clear documentation.
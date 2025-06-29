# Mock Streaming System

The mock streaming system enables local development and testing of Script Kit generation without requiring API keys or network access. It provides realistic streaming behavior with configurable scenarios and error injection.

## Quick Start

### Browser Console

Enable mock streaming in development mode:

```javascript
// Enable with default settings (short script)
__mockStreaming.enable()

// Enable with specific scenario
__mockStreaming.enable('long')

// Enable with error simulation
__mockStreaming.enable('short', 'rate_limit')

// Disable mock streaming
__mockStreaming.disable()

// View current configuration
__mockStreaming.config()
```

### URL Parameters

Add query parameters to enable mock streaming:

```
http://localhost:3000/scripts/new?mock=true&mock_scenario=long&mock_error=network_timeout
```

### Environment Variables

Set environment variables for server-side configuration:

```bash
MOCK_STREAMING=true
MOCK_SCENARIO=long
MOCK_ERROR=rate_limit
MOCK_ERROR_AFTER=5
MOCK_CHUNK_SIZE=20
MOCK_DELAY_MS=100
```

## Available Scenarios

### `short` (default)
- Simple "Hello World" script
- Fast streaming (20 char chunks, 50ms delay)
- Good for basic testing

### `long`
- Complex file organizer script
- Medium streaming (50 char chunks, 30ms delay)
- Tests longer content handling

### `error_midstream`
- Script with error injection point
- Demonstrates mid-stream error handling
- Use with error parameter for controlled failures

### `slow_stream`
- Simulates slow network conditions
- Very small chunks (5 chars) with long delays (200ms)
- Tests loading states and user patience

### `instant`
- No streaming delay
- Large chunks (1000 chars)
- Tests immediate response handling

### `unicode_stress`
- Tests special characters and emojis
- Unicode handling verification
- International character support

## Error Types

### `network_timeout` (408)
- Simulates connection timeouts
- Shows retry option

### `rate_limit` (429)
- Rate limiting simulation
- Longer toast duration (10s)
- No retry option

### `auth_failed` (401)
- Authentication errors
- Shows sign-in button
- Redirects to auth page

### `server_error` (500)
- Internal server errors
- Contact support option
- Error tracking integration

### `invalid_prompt` (400)
- Validation errors
- Immediate response
- No streaming

## Configuration Priority

1. **localStorage** (highest priority)
   - Persists across reloads
   - Set via console or API

2. **URL Parameters**
   - One-time override
   - Good for sharing test cases

3. **Environment Variables** (lowest priority)
   - Server-side defaults
   - CI/CD configuration

## API Endpoint

The mock endpoint mirrors the production API:

```
POST /api/generate-ai-gateway/mock?scenario=short&error=rate_limit
```

Query parameters:
- `scenario`: Script scenario to use
- `error`: Error type to inject
- `error_after`: Number of chunks before error
- `chunk_size`: Characters per chunk
- `delay_ms`: Milliseconds between chunks
- `skip_db`: Skip database operations (true/false)

## Error Handling

The system includes comprehensive error handling:

1. **Error Categorization**
   - Network, auth, rate limit, validation, server errors
   - Automatic error type detection from messages

2. **User Notifications**
   - Toast notifications with contextual actions
   - Retry, sign in, or contact support options
   - Error-specific durations and messaging

3. **Developer Tools**
   - Console logging in development
   - Error details and timestamps
   - Production error tracking hooks

## Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run mock streaming tests specifically
pnpm test mock-streaming
pnpm test stream-error-handler
pnpm test mock-integration
```

## Usage Examples

### Basic Script Generation

```javascript
// Enable mock streaming
__mockStreaming.enable('short')

// Generate a script normally
// The API will use the mock endpoint automatically
```

### Error Testing

```javascript
// Test rate limiting
__mockStreaming.enable('short', 'rate_limit')

// Test network timeout after 3 chunks
__mockStreaming.setConfig({
  enabled: true,
  scenario: 'long',
  error: 'network_timeout',
  errorAfterChunks: 3
})
```

### Performance Testing

```javascript
// Test slow streaming
__mockStreaming.enable('slow_stream')

// Test with custom timing
__mockStreaming.setConfig({
  enabled: true,
  scenario: 'long',
  chunkSize: 10,
  delayMs: 500
})
```

### Integration Testing

```javascript
// In your test files
import { enableMockStreaming } from '@/lib/mock-integration'
import { testMockStreaming } from '@/lib/mock-streaming'

// Test streaming behavior
const result = await testMockStreaming({
  scriptId: 'test-123',
  scenario: 'short',
  error: 'server_error',
  errorAfterChunks: 5
})

expect(result.error).toBeDefined()
expect(result.chunks.length).toBe(5)
```

## Architecture

The mock system consists of:

1. **Mock Scripts** (`lib/mock-scripts.ts`)
   - Predefined script scenarios
   - Error type definitions

2. **Mock Streaming** (`lib/mock-streaming.ts`)
   - ReadableStream creation
   - Chunk management
   - Error injection

3. **Mock Integration** (`lib/mock-integration.ts`)
   - Configuration management
   - Fetch interception
   - Console API

4. **Mock Endpoint** (`app/api/generate-ai-gateway/mock/route.ts`)
   - HTTP endpoint
   - Database integration (optional)
   - Response formatting

5. **Error Handler** (`components/StreamErrorHandler.tsx`)
   - Error categorization
   - Toast notifications
   - User actions

## Best Practices

1. **Development**
   - Use mock streaming for all local development
   - Test error scenarios before production
   - Verify unicode handling

2. **Testing**
   - Create test-specific scenarios
   - Use consistent timing for CI
   - Test all error paths

3. **Debugging**
   - Check console for configuration
   - Use browser DevTools network tab
   - Enable verbose logging

4. **Performance**
   - Adjust chunk sizes for realistic testing
   - Simulate network conditions
   - Test with various content lengths
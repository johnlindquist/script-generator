# AI Model Configuration

This application uses **two different AI models** for different purposes to optimize cost and performance.

## Environment Variables

### `DEFAULT_AI_SDK_MODEL` (Main Script Generator)

- **Used by:** `/api/generate-ai-gateway`
- **Purpose:** Generate complete Script Kit scripts from user prompts
- **Default:** `openai/gpt-5`
- **Requirements:** Needs a powerful model with large context window
- **Prompt size:** ~2,000 lines of documentation + examples + user prompt

### `SUGGESTIONS_AI_MODEL` (Suggestion Generator)

- **Used by:** `/api/next-suggestions` and `/api/debug/suggestions-prompt`
- **Purpose:** Generate 5 quick suggestion buttons for the wizard UI
- **Default:** `openai/gpt-5-nano`
- **Requirements:** Needs a fast, lightweight model
- **Prompt size:** ~200 lines of Script Kit docs + breadcrumb context

## Configuration

Set these environment variables in your `.env.local` file:

```bash
# Main script generation (powerful model)
DEFAULT_AI_SDK_MODEL=openai/gpt-5

# Suggestions generation (fast, cheap model)
SUGGESTIONS_AI_MODEL=openai/gpt-5-nano
```

## Why Two Different Models?

### Main Script Generator (`openai/gpt-5`)

- Generates complete, working Script Kit code
- Receives large context: system prompts, API docs, examples, types
- Temperature: 0.4 (balanced creativity)
- Needs to understand complex API patterns and generate syntactically correct code
- Called once per script generation

### Suggestion Generator (`openai/gpt-5-nano`)

- Generates 5 short suggestion strings (not code)
- Receives minimal context: Script Kit API overview + user's path
- Temperature: 0.6 (slightly more creative for varied suggestions)
- Simple text generation task
- Called frequently (every wizard step)

## Cost Optimization

Using `gpt-5-nano` for suggestions can **significantly reduce costs**:

- Suggestions are called multiple times per user session
- Each suggestion generation is a simple 5-string array output
- No need for the full context window of a larger model

## Model Options

You can use any model supported by Vercel AI Gateway:

### OpenAI Models

- `openai/gpt-5` (recommended for main generator)
- `openai/gpt-5-nano` (recommended for suggestions)
- `openai/gpt-4o`
- `openai/gpt-4o-mini`

### Anthropic Models

- `anthropic/claude-3-5-sonnet-20241022`
- `anthropic/claude-3-5-haiku-20241022`

### Google Models

- `google/gemini-2.0-flash-exp`
- `google/gemini-1.5-pro`

### Other Providers

- Any model available through Vercel AI Gateway

## Testing

After changing models, test both flows:

1. **Test suggestion generation:**

   - Click through the wizard
   - Verify 5 suggestions appear at each step
   - Check suggestions are relevant and varied

2. **Test script generation:**
   - Complete the wizard and generate a script
   - Verify the generated code is complete and correct
   - Check that it includes proper metadata and imports

## Troubleshooting

### Both APIs using the same model?

Check that you've set **both** environment variables. If only `DEFAULT_AI_SDK_MODEL` is set, suggestions will fall back to that model.

### Suggestions too slow?

Ensure `SUGGESTIONS_AI_MODEL` is set to a fast model like `gpt-5-nano`.

### Script quality decreased?

Ensure `DEFAULT_AI_SDK_MODEL` is set to a powerful model like `gpt-5` or `claude-3-5-sonnet`.

## Related Files

- `app/api/generate-ai-gateway/route.ts` - Main script generator
- `app/api/next-suggestions/route.ts` - Suggestion generator
- `app/api/debug/suggestions-prompt/route.ts` - Debug suggestions
- `lib/config.ts` - General configuration

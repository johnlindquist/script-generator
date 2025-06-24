# Script Generator Project Overview

## What is Script Generator?

Script Generator is an AI-powered web application that helps users create Script Kit automation scripts using natural language. Script Kit is an open-source, cross-platform desktop app for creating and running TypeScript automation scripts. This web app democratizes script creation by leveraging AI to generate working scripts from simple descriptions.

## Core Technologies

### Frontend Stack
- **Next.js 15** with App Router - React framework with server-side capabilities
- **TypeScript** - Type-safe JavaScript for better developer experience
- **Tailwind CSS** - Utility-first CSS framework (dark theme by default)
- **XState v5** - State machine library for managing complex UI states
- **Monaco Editor** - VS Code's editor for in-browser code editing
- **Framer Motion** - Animation library for smooth UI transitions
- **React Hot Toast** - Toast notifications
- **nuqs** - URL state management for shareable states

### Backend Stack
- **PostgreSQL** (Neon) - Primary database with connection pooling
- **Prisma ORM** - Type-safe database access layer
- **NextAuth.js** - Authentication with GitHub OAuth
- **Vercel AI SDK** - Streaming AI responses with multiple provider support
- **AI Providers**: 
  - Anthropic Claude (primary)
  - Google Gemini
  - OpenRouter (fallback)

### Key Libraries
- **@vercel/ai-sdk-gateway** - AI model routing and management
- **React Markdown** - Render markdown content
- **Prism** - Syntax highlighting
- **SWR** - Data fetching with caching
- **Cloudinary** - Image optimization and delivery
- **GitHub API** (@octokit/rest) - Sponsor verification

## Project Structure

```
/app                       # Next.js App Router
  /api                    # API routes
    /auth                 # NextAuth endpoints
    /generate-ai-gateway  # Main AI generation endpoint
    /scripts             # Script CRUD operations
    /usage               # Usage tracking
    /lucky               # Random script generation
  /[username]/[scriptId]  # Dynamic script pages
  /scripts               # Script browsing/management pages
    /new                 # New script generation
    /mine                # User's scripts
    /import              # Import existing scripts

/components              # React components
  ScriptGenerationClient.tsx    # Main generation UI
  ScriptGenerationMachine.ts    # XState state machine
  ScriptCard.tsx               # Script display card
  NavBar.tsx                   # Navigation
  AIPromptBuilder.tsx          # Interactive prompt helper
  ScriptSuggestions.tsx        # Suggestion carousel

/lib                     # Utilities and services
  /ai-gateway.ts         # AI provider configuration
  /apiService.ts         # Client API functions
  /prisma.ts            # Database client
  /config.ts            # App configuration
  /strings.ts           # UI text constants

/prisma                  # Database
  /schema.prisma        # Database schema

/prompts                 # AI prompts and docs
  /SYSTEM.md            # Main system prompt
  /GUIDE.md             # Script Kit guide
  /API-GENERATED.md     # API documentation

/kit                     # Script Kit type definitions
  /types/*.d.ts         # TypeScript definitions
```

## Core Workflows

### 1. Script Generation Flow
1. User enters natural language description
2. Frontend validates input (min 15 characters)
3. XState machine manages generation states:
   - `idle` → `thinkingDraft` → `generatingDraft` → `complete`
4. API creates database record and starts streaming
5. AI generates TypeScript code with Script Kit APIs
6. Monaco editor displays streaming results
7. User can save, install, or revise the script

### 2. Authentication Flow
- GitHub OAuth via NextAuth.js
- Session stored as JWT (12-hour expiration)
- GitHub sponsor status checked on login
- Test accounts available for development

### 3. Script Management
- Scripts saved to PostgreSQL with metadata
- Automatic versioning on updates
- Fork functionality for creating variants
- Lock mechanism when scripts gain traction
- Search and filter capabilities

## Database Schema

### Core Models
- **User**: GitHub users with auth info
- **Script**: Generated scripts with metadata
  - Includes prompt, content, owner, timestamps
  - Tracks stars, saves, locks status
- **Usage**: Daily generation tracking
- **Favorite/Install/Verification**: User interactions
- **GithubSponsor**: Sponsor information
- **ScriptVersion**: Version history

### Key Features
- Trigram index on script content for fast search
- Unique constraints prevent duplicate interactions
- Cascade deletes maintain referential integrity

## API Endpoints

### Generation
- `POST /api/generate-ai-gateway` - Main generation endpoint
- `GET /api/lucky` - Random script inspiration
- `GET /api/next-suggestions` - AI-powered suggestions

### Scripts
- `GET/POST /api/scripts` - List and create scripts
- `GET/PATCH/DELETE /api/scripts/[id]` - Individual script operations
- `GET /api/scripts/[id]/raw` - Raw script content

### User Actions
- `POST /api/favorite` - Toggle favorite
- `POST /api/verify` - Toggle verification
- `POST /api/install` - Track installation
- `POST /api/star` - Toggle star

### Utility
- `GET /api/usage` - Check daily limits
- `GET /api/check-sponsor` - Verify GitHub sponsor status

## State Management

The app uses XState for complex UI states, particularly in `ScriptGenerationMachine.ts`:

### States
1. **idle** - Waiting for user input
2. **thinkingDraft** - Preparing generation request
3. **generatingDraft** - Streaming AI response
4. **complete** - Script ready for actions
5. **saving/installing** - Persisting operations

### Events
- `SET_PROMPT` - Update prompt text
- `GENERATE_DRAFT` - Start generation
- `UPDATE_EDITABLE_SCRIPT` - Stream updates
- `COMPLETE_GENERATION` - Finish streaming
- `SAVE_SCRIPT` / `SAVE_AND_INSTALL` - Persist actions
- `RESET` - Return to initial state

## Key Features

### 1. AI-Powered Generation
- Multiple AI providers with fallback
- Streaming responses for better UX
- Context-aware prompts with Script Kit docs
- "I'm Feeling Lucky" random generation

### 2. User Experience
- Real-time code streaming to Monaco editor
- Syntax highlighting and IntelliSense
- Interactive prompt builder
- Script suggestions carousel
- Responsive design for all devices

### 3. Script Management
- Save and organize generated scripts
- Fork existing scripts
- Search and filter capabilities
- Version history tracking
- Installation tracking

### 4. Rate Limiting & Monetization
- 24 daily generations (100 for sponsors)
- GitHub sponsor integration
- Usage tracking and analytics
- API key support for CLI access

### 5. Developer Features
- TypeScript throughout
- Comprehensive error handling
- Debug panel in development
- Interaction logging
- Test user accounts

## Configuration

### Environment Variables
- `NEON_POSTGRES_*` - Database connection
- `NEXTAUTH_*` - Authentication config
- `GITHUB_*` - GitHub OAuth credentials
- `ANTHROPIC_API_KEY` - AI provider key
- `GOOGLE_GENERATIVE_AI_API_KEY` - Gemini key
- `OPENROUTER_API_KEY` - Fallback AI provider

### Key Configuration Files
- `lib/config.ts` - App-wide settings
- `lib/strings.ts` - UI text constants
- `prompts/` - AI system prompts
- `kit/types/` - Script Kit type definitions

## Development Workflow

### Setup
1. Install dependencies: `pnpm install`
2. Setup database: `pnpm prisma migrate dev`
3. Configure environment variables
4. Run development server: `pnpm dev`

### Key Scripts
- `pnpm dev` - Start development server
- `pnpm build` - Production build
- `pnpm check` - TypeScript and ESLint checks
- `pnpm test` - Run tests
- `pnpm db` - Open Prisma Studio

### Testing
- Unit tests with Vitest
- E2E tests with Playwright
- Test users for authentication flows
- Debug panel for state inspection

## Security Considerations

1. **Authentication**: GitHub OAuth only
2. **Authorization**: Ownership checks on mutations
3. **Rate Limiting**: Daily usage caps
4. **Input Validation**: Minimum prompt length
5. **Script Locking**: Prevents tampering with popular scripts
6. **API Keys**: Secure storage for CLI access

## Performance Optimizations

1. **Streaming**: AI responses stream in real-time
2. **Database Indexes**: Trigram index for fast search
3. **Caching**: SWR for data fetching
4. **Code Splitting**: Next.js automatic optimization
5. **Image Optimization**: Cloudinary integration

## Deployment

- Hosted on Vercel
- PostgreSQL on Neon
- Environment variables in Vercel dashboard
- Automatic deployments from main branch
- Preview deployments for PRs

## Debugging and Troubleshooting

### Vercel CLI Logs Investigation
- Use `vercel logs` to easily inspect deployment logs
- Quickly diagnose issues by running `vercel logs --debug` for verbose output
- Filter logs by deployment or instance using additional CLI flags
- Check both server-side and client-side logs to understand failures
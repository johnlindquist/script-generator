export const maxDuration = 180

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { logInteraction } from '@/lib/interaction-logger'
import { type ModelMessage, streamText, type LanguageModel } from 'ai'
import { DRAFT_PASS_PROMPT } from './prompt'
import { extractUserInfo } from '@/lib/generation'
import type { GatewayModelId } from '@ai-sdk/gateway'
import { gateway } from '@/lib/ai-gateway'
import { GenerateRequestSchema } from '@/lib/schemas'

// Explicitly declare this route uses Node.js runtime
export const runtime = 'nodejs'

const DAILY_LIMIT = 24
const CLI_API_KEY = process.env.CLI_API_KEY
const DEFAULT_MODEL: GatewayModelId = process.env.DEFAULT_AI_SDK_MODEL as GatewayModelId || 'anthropic/claude-4-sonnet'

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).slice(2, 7)
  const interactionTimestamp = req.headers.get('Interaction-Timestamp') || new Date().toISOString()

  await logInteraction(interactionTimestamp, 'serverRoute', 'AI Gateway API Request Started', {
    requestId,
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(
      Array.from(req.headers.entries()).filter(
        ([key]) => !['authorization', 'cookie'].includes(key.toLowerCase())
      )
    ),
  })

  // Add detailed cookie logging to understand session state
  const cookieHeader = req.headers.get('cookie')
  await logInteraction(interactionTimestamp, 'serverRoute', 'Cookie header analysis', {
    requestId,
    hasCookieHeader: !!cookieHeader,
    cookieLength: cookieHeader?.length || 0,
    cookieNames: cookieHeader?.split(';').map(c => c.trim().split('=')[0]) || [],
    hasNextAuthCookies: cookieHeader?.includes('next-auth') || false,
    hasSessionToken: cookieHeader?.includes('next-auth.session-token') || false,
  })

  let session = null

  try {
    // Enhanced session retrieval with detailed logging
    await logInteraction(interactionTimestamp, 'serverRoute', 'Getting server session', {
      requestId,
      authOptionsAvailable: !!authOptions,
      authOptionsKeys: authOptions ? Object.keys(authOptions) : [],
    })

    // Log the request object details for NextAuth
    await logInteraction(interactionTimestamp, 'serverRoute', 'Request object for NextAuth', {
      requestId,
      requestUrl: req.url,
      requestMethod: req.method,
      requestHeaders: {
        'user-agent': req.headers.get('user-agent'),
        accept: req.headers.get('accept'),
        referer: req.headers.get('referer'),
        origin: req.headers.get('origin'),
      },
    })

    session = await getServerSession(authOptions)

    // Extremely detailed session logging
    await logInteraction(interactionTimestamp, 'serverRoute', 'Session retrieval detailed result', {
      requestId,
      hasSession: !!session,
      sessionType: typeof session,
      sessionIsNull: session === null,
      sessionIsUndefined: session === undefined,
      sessionKeys: session ? Object.keys(session) : [],
      sessionExpires: session?.expires,
      sessionUser: session?.user
        ? {
          hasUser: !!session.user,
          userKeys: Object.keys(session.user),
          userId: session.user.id,
          userEmail: session.user.email,
          username: session.user.username,
          userType: typeof session.user,
        }
        : null,
    })

    // Test if the issue is with the specific user properties
    if (session) {
      await logInteraction(interactionTimestamp, 'serverRoute', 'Session user property deep dive', {
        requestId,
        userIdExists: 'id' in session.user,
        userIdValue: session.user.id,
        userIdType: typeof session.user.id,
        userIdTruthy: !!session.user.id,
        userIdLength: session.user.id?.length || 0,
        userObjectStringified: JSON.stringify(session.user),
      })
    }

    logInteraction(interactionTimestamp, 'serverRoute', 'Started /api/generate-ai-gateway route', {
      requestId,
      hasSession: !!session,
      authMethod: 'pending',
    })

    // Get user info from request
    let userId = req.headers.get('X-CLI-API-Key') ? 'cli-user' : undefined
    let authMethod = 'none'

    // Check for CLI API key first
    const apiKey = req.headers.get('X-CLI-API-Key')?.toLowerCase()
    const expectedApiKey = CLI_API_KEY?.toLowerCase()

    await logInteraction(interactionTimestamp, 'serverRoute', 'CLI API Key check', {
      requestId,
      hasApiKeyHeader: !!apiKey,
      hasExpectedApiKey: !!expectedApiKey,
      apiKeyMatch: apiKey && expectedApiKey && apiKey === expectedApiKey,
      apiKeyLength: apiKey?.length || 0,
      expectedKeyLength: expectedApiKey?.length || 0,
    })

    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
      // Skip auth for CLI tools with valid API key
      await logInteraction(interactionTimestamp, 'serverRoute', 'CLI API key auth successful', {
        requestId,
        userId: 'cli-user',
      })
      userId = 'cli-user'
      authMethod = 'cli'
    } else {
      // Fall back to session auth for web requests
      await logInteraction(
        interactionTimestamp,
        'serverRoute',
        'Attempting session auth fallback',
        {
          requestId,
          hasSession: !!session,
          hasUser: !!session?.user,
          hasUserId: !!session?.user?.id,
          sessionExpires: session?.expires,
          userIdValue: session?.user?.id,
          userIdCheck: session?.user?.id ? 'truthy' : 'falsy',
        }
      )

      // More granular checks
      const sessionFailureReasons = []
      if (!session) sessionFailureReasons.push('no_session')
      if (session && !session.user) sessionFailureReasons.push('no_user_object')
      if (!session?.user?.id) sessionFailureReasons.push('no_user_id')
      if (session?.user?.id === '') sessionFailureReasons.push('empty_user_id')
      if (session?.user?.id === null) sessionFailureReasons.push('null_user_id')
      if (session?.user?.id === undefined) sessionFailureReasons.push('undefined_user_id')

      await logInteraction(interactionTimestamp, 'serverRoute', 'Session failure analysis', {
        requestId,
        sessionFailureReasons,
        wouldFail: !session?.user?.id,
        conditionalCheck: {
          session: !!session,
          'session.user': !!session?.user,
          'session.user.id': !!session?.user?.id,
          combined: !!session?.user?.id,
        },
      })

      if (!session?.user?.id) {
        await logInteraction(
          interactionTimestamp,
          'serverRoute',
          'Session auth failed - UNAUTHORIZED',
          {
            requestId,
            hasSession: !!session,
            hasUser: !!session?.user,
            hasUserId: !!session?.user?.id,
            sessionData: session
              ? {
                expires: session.expires,
                userKeys: session.user ? Object.keys(session.user) : [],
                fullUserObject: session.user,
              }
              : null,
            failureReasons: sessionFailureReasons,
          }
        )
        return new Response('Unauthorized - Please sign in', { status: 401 })
      }
      userId = session.user.id
      authMethod = 'session'
      await logInteraction(interactionTimestamp, 'serverRoute', 'Session auth successful', {
        requestId,
        userId: userId,
        username: session.user.username,
        authMethod,
      })
    }

    await logInteraction(interactionTimestamp, 'serverRoute', 'Authentication complete', {
      requestId,
      userId,
      authMethod,
    })

    // Parse and validate the request body
    const rawBody = await req.json()
    const parseResult = GenerateRequestSchema.safeParse(rawBody)

    if (!parseResult.success) {
      await logInteraction(interactionTimestamp, 'serverRoute', 'Invalid request body', {
        requestId,
        errors: parseResult.error.errors,
      })
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.errors }, { status: 400 })
    }

    const { prompt, luckyRequestId } = parseResult.data

    await logInteraction(interactionTimestamp, 'serverRoute', 'Request body parsed', {
      requestId,
      luckyRequestId,
      hasPrompt: !!prompt,
      promptLength: prompt?.length || 0,
      userId: userId,
      model: DEFAULT_MODEL,
    })

    // The prompt is already validated by Zod schema, so this check is now redundant
    // But kept for consistency with logging
    if (!prompt) {
      await logInteraction(interactionTimestamp, 'serverRoute', 'Missing prompt error', {
        requestId,
        bodyKeys: Object.keys(parseResult.data),
      })
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    // Fetch structured script kit docs
    let structuredScriptKitDocsContent = ''
    try {
      const origin = new URL(req.url).origin
      const scriptKitDocsUrl = new URL('/api/script-kit-docs', origin)
      const scriptKitDocsRes = await fetch(scriptKitDocsUrl.toString())
      if (scriptKitDocsRes.ok) {
        const docsData = await scriptKitDocsRes.json()
        structuredScriptKitDocsContent = JSON.stringify(docsData, null, 2)
      } else {
        await logInteraction(
          interactionTimestamp,
          'serverRoute',
          'Failed to fetch script kit docs',
          {
            requestId,
            status: scriptKitDocsRes.status,
            statusText: scriptKitDocsRes.statusText,
          }
        )
        // Decide if this is a critical failure or if we can proceed without these docs
        // For now, proceeding with empty content
      }
    } catch (error: unknown) {
      await logInteraction(interactionTimestamp, 'serverRoute', 'Error fetching script kit docs', {
        requestId,
        errorMessage: error instanceof Error ? error.message : String(error),
      })
      // Proceeding with empty content
    }

    // Create a new script record and store the ID for later use
    await logInteraction(interactionTimestamp, 'serverRoute', 'Creating script record', {
      requestId,
      userId,
    })

    const { id: scriptId } = await prisma.script.create({
      data: {
        title: 'Draft Script',
        content: '',
        summary: '',
        ownerId: userId,
        prompt,
      },
      select: {
        id: true,
      },
    })

    await logInteraction(interactionTimestamp, 'serverRoute', 'Script record created', {
      requestId,
      scriptId,
    })

    // Handle usage tracking (simplified)
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    await logInteraction(interactionTimestamp, 'serverRoute', 'Checking usage limits', {
      requestId,
      userId,
      date: now.toISOString(),
    })

    // Get or create usage record
    let usage = await prisma.usage.findUnique({
      where: {
        userId_date: {
          userId: userId,
          date: now,
        },
      },
    })

    await logInteraction(interactionTimestamp, 'serverRoute', 'Usage record lookup result', {
      requestId,
      userId,
      hasExistingUsage: !!usage,
      currentCount: usage?.count || 0,
    })

    if (!usage) {
      // Create user and usage if they don't exist
      await logInteraction(interactionTimestamp, 'serverRoute', 'Creating user and usage records', {
        requestId,
        userId,
      })

      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          username: userId === 'cli-user' ? 'CLI Tool' : session?.user?.username || 'Unknown',
        },
      })

      usage = await prisma.usage.create({
        data: {
          userId: userId,
          date: now,
          count: 0,
        },
      })

      await logInteraction(interactionTimestamp, 'serverRoute', 'User and usage records created', {
        requestId,
        userId,
        usageCount: usage.count,
      })
    }

    // Fetch database user info for extractUserInfo
    const dbUser =
      userId === 'cli-user'
        ? null
        : await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true },
        })

    // Check daily limit
    if (usage.count >= DAILY_LIMIT) {
      await logInteraction(interactionTimestamp, 'serverRoute', 'Daily limit exceeded', {
        requestId,
        userId,
        currentCount: usage.count,
        limit: DAILY_LIMIT,
      })
      return new NextResponse('Daily limit exceeded', { status: 429 })
    }

    // Increment usage count
    await logInteraction(interactionTimestamp, 'serverRoute', 'Incrementing usage count', {
      requestId,
      userId,
      currentCount: usage.count,
      newCount: usage.count + 1,
    })

    await prisma.usage.update({
      where: {
        userId_date: {
          userId: userId,
          date: now,
        },
      },
      data: {
        count: { increment: 1 },
      },
    })

    // Get user info for prompt using extractUserInfo
    let userInfo: {
      name: string | null
      username: string | null
      fullName: string | null
      image: string | null
    }

    if (userId === 'cli-user') {
      userInfo = {
        name: 'CLI Tool',
        username: 'CLI Tool',
        fullName: 'CLI Tool',
        image: null,
      }
    } else if (session?.user) {
      userInfo = extractUserInfo(session, dbUser)
    } else {
      userInfo = {
        name: null,
        username: null,
        fullName: null,
        image: null,
      }
    }

    // Generate draft script using Vercel AI Gateway
    const draftFinalPrompt = DRAFT_PASS_PROMPT.replace(
      '{structured_script_kit_docs}',
      structuredScriptKitDocsContent
    ).replace('{userInfo}', JSON.stringify(userInfo))

    await logInteraction(interactionTimestamp, 'serverRoute', 'Starting draft generation', {
      requestId,
      model: DEFAULT_MODEL,
      scriptId,
      promptLength: draftFinalPrompt.length,
      userInfo,
    })

    // Convert to messages format for AI Gateway
    const messages: Array<ModelMessage> = [
      {
        role: 'system',
        content: draftFinalPrompt,
        providerOptions: {
          anthropic: {
            cacheControl: {
              type: 'ephemeral',
            },
          },
        },
      },
      { role: 'user', content: `${prompt} Generate _ONLY_ the script content below this line.` },
    ]

    await logInteraction(
      interactionTimestamp,
      'serverRoute',
      'Calling streamText with AI Gateway',
      {
        requestId,
        model: DEFAULT_MODEL,
        messagesCount: messages.length,
      }
    )


    const model = gateway.languageModel(DEFAULT_MODEL as GatewayModelId) as unknown as LanguageModel

    const result = await streamText({
      model,
      messages,
      temperature: 0.4,
      onError: (errorData: { error: unknown }) => {
        const error = errorData.error as Error
        logInteraction(interactionTimestamp, 'serverRoute', 'Error while streaming', {
          requestId,
          error: error.message,
          stack: error.stack,
        })
      },
    })

    await logInteraction(
      interactionTimestamp,
      'serverRoute',
      'streamText result obtained, returning data stream response',
      {
        requestId,
      }
    )

    // Return the AI stream as a Response
    // The result provides a readable stream of strings in `textStream`.
    const responseStream = new ReadableStream({
      async start(controller) {
        await logInteraction(interactionTimestamp, 'serverRoute', 'AI Stream started', {
          requestId,
          luckyRequestId,
          scriptId,
          promptLength: draftFinalPrompt.length,
          userId,
        })

        // Send script ID first
        if (scriptId) {
          controller.enqueue(new TextEncoder().encode(`__SCRIPT_ID__${scriptId}__SCRIPT_ID__`))
        }

        let accumulatedCompletion = ''
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(new TextEncoder().encode(chunk))
            accumulatedCompletion += chunk
          }
          await logInteraction(interactionTimestamp, 'serverRoute', 'AI Stream completed', {
            requestId,
            completion: accumulatedCompletion.trim(),
          })
          controller.close()
        } catch (error: unknown) {
          await logInteraction(
            interactionTimestamp,
            'serverRoute',
            'Error during AI stream processing',
            {
              requestId,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            }
          )
          controller.error(error)
        }
      },
    })

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    await logInteraction(interactionTimestamp, 'serverRoute', 'ERROR IN AI GATEWAY ROUTE', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      hasSession: !!session,
      sessionData: session
        ? {
          expires: session.expires,
          hasUser: !!session.user,
          userId: session.user?.id,
        }
        : null,
    })

    return NextResponse.json(
      {
        error: 'Failed to generate script',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

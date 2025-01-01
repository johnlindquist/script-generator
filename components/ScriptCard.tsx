'use client'

import Link from 'next/link'
import { Highlight, themes } from 'prism-react-renderer'
import { STRINGS } from '@/lib/strings'

import CopyButtonClient from './CopyButtonClient'
import VerifyButtonClient from './VerifyButtonClient'
import FavoriteButtonClient from './FavoriteButtonClient'
import InstallButtonClient from './InstallButtonClient'
import DeleteButtonClient from './DeleteButtonClient'
import EditButtonClient from './EditButtonClient'
import ForkButtonClient from './ForkButtonClient'

interface ScriptCardProps {
  script: {
    id: string
    title: string
    content: string
    saved: boolean
    locked: boolean
    createdAt: Date
    dashedName?: string | null
    owner: {
      username: string
      id: string
    }
    _count?: {
      verifications: number
      favorites: number
      installs: number
    }
    isVerified?: boolean
    isFavorited?: boolean
  }
  isAuthenticated: boolean
  currentUserId?: string
  onDeleted?: (scriptId: string) => void
  onScriptChanged?: () => void
}

export default function ScriptCard({
  script,
  isAuthenticated,
  currentUserId,
  onDeleted,
  onScriptChanged,
}: ScriptCardProps) {
  const isOwner = currentUserId === script.owner.id

  // Debug logging
  console.log(
    'ScriptCard Debug:',
    JSON.stringify({
      scriptId: script.id,
      scriptTitle: script.title,
      isLocked: script.locked,
      isOwner,
      currentUserId,
      ownerId: script.owner.id,
      favoriteCount: script._count?.favorites ?? 0,
      verificationCount: script._count?.verifications ?? 0,
      installCount: script._count?.installs ?? 0,
    })
  )

  return (
    <div
      className="border border-neutral-700 rounded-lg px-6 py-4 shadow-2xl flex flex-col h-[500px] break-inside hover:border-amber-400/20 transition-colors bg-zinc-900/90"
      data-script-id={script.id}
      data-debug={JSON.stringify({
        isLocked: script.locked,
        isOwner,
        currentUserId,
        ownerId: script.owner.id,
      })}
    >
      <div className="mb-4">
        <Link href={`/scripts/${script.id}`} className="block hover:opacity-75 transition-opacity">
          <h2 className="text-xl font-lexend font-semibold mb-2 text-amber-300">{script.title}</h2>
          <p className="text-slate-400 text-sm">
            {STRINGS.SCRIPT_CARD.byAuthorDate
              .replace('{username}', script.owner.username)
              .replace('{date}', new Date(script.createdAt).toLocaleDateString())}
            {!isOwner && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-400/10 text-amber-300">
                <svg className="w-4 h-4 mr-1" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                {script.owner.username}
              </span>
            )}
            {script.locked && isOwner && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-400/10 text-red-300">
                <svg
                  className="w-4 h-4 mr-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Locked
              </span>
            )}
          </p>
        </Link>
      </div>
      <div className="flex-grow flex flex-col overflow-hidden">
        <Link href={`/scripts/${script.id}`} className="block flex-grow min-h-0">
          <div className="bg-neutral-800/50 rounded-lg h-full border border-amber-400/10 hover:border-amber-400/20 transition-colors">
            <Highlight theme={themes.nightOwl} code={script.content} language="typescript">
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre
                  className={`${className} p-4 h-full overflow-y-auto`}
                  style={{
                    ...style,
                    margin: 0,
                    background: 'transparent',
                  }}
                >
                  {tokens.map((line, i) => (
                    <div key={i} {...getLineProps({ line })} className="whitespace-pre break-all">
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>
          </div>
        </Link>
      </div>
      <div className="flex justify-between items-center mt-6 pt-5 border-t border-neutral-700">
        <div className="flex gap-2">
          <CopyButtonClient content={script.content} />

          {isOwner && !script.locked && (
            <>
              <EditButtonClient scriptId={script.id} />
              <DeleteButtonClient
                scriptId={script.id}
                onDeleted={() => {
                  onDeleted?.(script.id)
                  onScriptChanged?.()
                }}
              />
            </>
          )}
          {isAuthenticated && (
            <ForkButtonClient scriptId={script.id} scriptContent={script.content} />
          )}
        </div>

        <div className="flex gap-2">
          <InstallButtonClient
            scriptId={script.id}
            dashedName={script.dashedName}
            initialInstallCount={script._count?.installs ?? 0}
          />

          <VerifyButtonClient
            scriptId={script.id}
            initialIsVerified={script.isVerified ?? false}
            initialVerifiedCount={script._count?.verifications ?? 0}
            isAuthenticated={isAuthenticated}
            isOwner={isOwner}
            onScriptChanged={onScriptChanged}
          />

          <FavoriteButtonClient
            scriptId={script.id}
            initialIsFavorited={script.isFavorited ?? false}
            initialFavoriteCount={script._count?.favorites ?? 0}
            isAuthenticated={isAuthenticated}
            onScriptChanged={onScriptChanged}
          />
        </div>
      </div>
    </div>
  )
}

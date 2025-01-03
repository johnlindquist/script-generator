'use client'

import Link from 'next/link'
import { Highlight, themes } from 'prism-react-renderer'
import { FaGithub } from 'react-icons/fa'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { Prisma } from '@prisma/client'
import { ScriptsResponse } from '@/types/script'

import CopyButtonClient from './CopyButtonClient'
import VerifyButtonClient from './VerifyButtonClient'
import FavoriteButtonClient from './FavoriteButtonClient'
import InstallButtonClient from './InstallButtonClient'
import DeleteButtonClient from './DeleteButtonClient'
import EditButtonClient from './EditButtonClient'
import ForkButtonClient from './ForkButtonClient'

type ScriptWithRelations = Prisma.ScriptGetPayload<{
  include: {
    owner: true
    _count: {
      select: {
        verifications: true
        favorites: true
        installs: true
      }
    }
  }
}> & {
  isVerified?: boolean
  isFavorited?: boolean
}

interface ScriptCardProps {
  script: ScriptWithRelations
  isAuthenticated: boolean
  currentUserId?: string
  onDeleted?: (scriptId: string) => void
  onScriptChanged?: () => void | Promise<ScriptsResponse | undefined>
  truncate?: boolean
}

export default function ScriptCard({
  script,
  isAuthenticated,
  currentUserId,
  onDeleted,
  truncate = false,
}: ScriptCardProps) {
  const isOwner = currentUserId === script.owner?.id

  return (
    <div
      className={`w-full border border-neutral-700 rounded-lg px-4 sm:px-6 py-4 shadow-2xl flex flex-col break-inside hover:border-amber-400/20 transition-colors bg-zinc-900/90 ${
        truncate ? 'h-auto sm:h-[500px]' : 'h-full'
      }`}
      data-script-id={script.id}
      data-debug={JSON.stringify({
        isLocked: script.locked,
        isOwner,
        currentUserId,
        ownerId: script.owner?.id,
      })}
    >
      <div className="mb-4 flex-shrink-0">
        <Link
          href={`/${script.owner?.username}/${script.id}`}
          className="block hover:opacity-75 transition-opacity"
        >
          <h2 className="text-xl font-semibold mb-2 text-amber-300">{script.title}</h2>
        </Link>

        <div className="flex justify-between">
          <div className="text-slate-400 text-sm flex items-center gap-2">
            <Link
              href={`/${script.owner?.username}`}
              className="hover:text-amber-300 transition-colors"
            >
              {script.owner?.fullName || script.owner?.username}
            </Link>

            <Link
              href={`https://github.com/${script.owner?.username}`}
              className="hover:opacity-75 transition-opacity"
            >
              <span className="inline-flex items-center py-0.5 rounded-full text-xs font-medium bg-gray-400/10 text-gray-300">
                <FaGithub className="w-4 h-4" />
              </span>
            </Link>
          </div>

          {isOwner && script.locked && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-400/10 text-red-300">
              <LockClosedIcon className="w-4 h-4 mr-1" />
              Locked
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Link href={`/${script.owner?.username}/${script.id}`} className="block flex-1 min-h-0">
          <div className="bg-neutral-800/50 rounded-lg h-full border border-amber-400/10 hover:border-amber-400/20 transition-colors">
            <Highlight
              theme={themes.nightOwl}
              code={truncate ? script.content.slice(0, 500) : script.content}
              language="typescript"
            >
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre
                  className={`${className} p-4 h-full ${truncate ? 'overflow-hidden' : 'overflow-y-auto'}`}
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
      <div className="flex flex-wrap justify-between items-start gap-y-4 mt-6 pt-5 border-t border-neutral-700 flex-shrink-0">
        <div className="flex gap-2 min-w-fit">
          <CopyButtonClient content={script.content} />

          {isOwner && !script.locked && (
            <>
              <EditButtonClient scriptId={script.id} />
              <DeleteButtonClient
                scriptId={script.id}
                onDeleted={() => {
                  onDeleted?.(script.id)
                }}
              />
            </>
          )}
          {isAuthenticated && (
            <ForkButtonClient scriptId={script.id} scriptContent={script.content} />
          )}
        </div>

        <div className="flex gap-2 min-w-fit">
          <div className="hidden sm:block">
            <InstallButtonClient
              scriptId={script.id}
              dashedName={script.dashedName}
              initialInstallCount={script._count?.installs ?? 0}
            />
          </div>

          <VerifyButtonClient
            scriptId={script.id}
            initialIsVerified={script.isVerified ?? false}
            initialVerifiedCount={script._count?.verifications ?? 0}
            isAuthenticated={isAuthenticated}
            isOwner={isOwner}
          />

          <FavoriteButtonClient
            scriptId={script.id}
            initialIsFavorited={script.isFavorited ?? false}
            initialFavoriteCount={script._count?.favorites ?? 0}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </div>
  )
}

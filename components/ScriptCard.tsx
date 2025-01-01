'use client'

import Link from 'next/link'
import { Highlight, themes } from 'prism-react-renderer'
import { FaGithub } from 'react-icons/fa'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { Prisma } from '@prisma/client'

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
  // console.log(
  //   'ScriptCard Debug:',
  //   JSON.stringify({
  //     scriptId: script.id,
  //     scriptTitle: script.title,
  //     isLocked: script.locked,
  //     isOwner,
  //     currentUserId,
  //     ownerId: script.owner.id,
  //     favoriteCount: script._count?.favorites ?? 0,
  //     verificationCount: script._count?.verifications ?? 0,
  //     installCount: script._count?.installs ?? 0,
  //   })
  // )

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
        <Link
          href={`/${script.owner.username}/${script.id}`}
          className="block hover:opacity-75 transition-opacity"
        >
          <h2 className="text-xl font-lexend font-semibold mb-2 text-amber-300">{script.title}</h2>
        </Link>

        <div className="flex justify-between">
          <div className="text-slate-400 text-sm flex items-center gap-2">
            <Link
              href={`/${script.owner.username}`}
              className="hover:text-amber-300 transition-colors"
            >
              {script.owner.fullName || script.owner.username}
            </Link>

            <Link
              href={`https://github.com/${script.owner.username}`}
              className="hover:opacity-75 transition-opacity"
            >
              <span className="inline-flex items-center py-0.5 rounded-full text-xs font-medium bg-gray-400/10 text-gray-300">
                <FaGithub className="w-4 h-4" />
              </span>
            </Link>
          </div>

          {
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-400/10 text-red-300">
              <LockClosedIcon className="w-4 h-4 mr-1" />
              Locked
            </span>
          }
        </div>
      </div>
      <div className="flex-grow flex flex-col overflow-hidden">
        <Link href={`/${script.owner.username}/${script.id}`} className="block flex-grow min-h-0">
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

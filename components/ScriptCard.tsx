'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Highlight, themes } from 'prism-react-renderer'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/24/solid'
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
    owner: {
      include: {
        sponsorship: true
      }
    }
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
  searchQuery?: string
}

const TRUNCATE_LINES = 12
const CONTEXT_LINES_BEFORE = 2

interface TruncationInfo {
  content: string
  linesBefore: number
  linesAfter: number
}

function getRelevantLines(
  content: string,
  searchQuery: string | undefined,
  truncate: boolean
): TruncationInfo {
  if (!truncate) return { content, linesBefore: 0, linesAfter: 0 }

  const lines = content.split('\n')

  if (!searchQuery) {
    // If no search query, return first N lines
    return {
      content: lines.slice(0, TRUNCATE_LINES).join('\n'),
      linesBefore: 0,
      linesAfter: Math.max(0, lines.length - TRUNCATE_LINES),
    }
  }

  // Find the first line that matches the search query
  const searchLower = searchQuery.toLowerCase()
  const matchIndex = lines.findIndex(line => line.toLowerCase().includes(searchLower))

  if (matchIndex === -1) {
    // If no match found, return first N lines
    return {
      content: lines.slice(0, TRUNCATE_LINES).join('\n'),
      linesBefore: 0,
      linesAfter: Math.max(0, lines.length - TRUNCATE_LINES),
    }
  }

  // Calculate the range of lines to show around the match
  const startLine = Math.max(0, matchIndex - CONTEXT_LINES_BEFORE)
  const endLine = Math.min(lines.length, startLine + TRUNCATE_LINES)

  return {
    content: lines.slice(startLine, endLine).join('\n'),
    linesBefore: startLine,
    linesAfter: Math.max(0, lines.length - endLine),
  }
}

interface LineIndicatorProps {
  count: number
  position: 'above' | 'below'
}

function LineIndicator({ count, position }: LineIndicatorProps) {
  return (
    <div
      className={`-mx-4 ${position === 'above' ? '-mt-4 mb-3' : ''} px-4 py-1 bg-amber-400/10 text-amber-300/80 text-sm border-${position === 'above' ? 'b' : 't'} border-amber-400/20 hover:bg-amber-400/20 transition-colors text-center`}
    >
      {count} {position === 'above' ? '' : ''}
      {count === 1 ? 'line' : 'lines'} {position} • View full script
    </div>
  )
}

function highlightText(text: string, searchQuery: string | undefined): React.ReactNode {
  if (!searchQuery || !text) return <>{text}</>

  const searchLower = searchQuery.toLowerCase()
  const textLower = text.toLowerCase()
  const index = textLower.indexOf(searchLower)

  if (index === -1) return <>{text}</>

  return (
    <>
      {text.slice(0, index)}
      <span className="bg-amber-300/25">{text.slice(index, index + searchQuery.length)}</span>
      {text.slice(index + searchQuery.length)}
    </>
  )
}

export default function ScriptCard({
  script,
  isAuthenticated,
  currentUserId,
  onDeleted,
  truncate = false,
  searchQuery,
}: ScriptCardProps) {
  const isOwner = currentUserId === script.owner?.id
  const isSponsor = !!script.owner?.sponsorship
  const {
    content: relevantContent,
    linesBefore,
    linesAfter,
  } = getRelevantLines(script.content, searchQuery, truncate)

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
          <h2 className="text-xl font-semibold mb-2 text-amber-300 flex items-center gap-2">
            {highlightText(script.title, searchQuery)}
          </h2>
        </Link>

        <div className="flex justify-between">
          <div className="text-slate-400 text-sm flex items-center gap-2">
            {isSponsor && <StarIcon className="w-4 h-4 text-yellow-400" />}
            <div className="flex items-center gap-2">
              <Link
                href={`/${script.owner?.username}`}
                className={`hover:text-amber-300 transition-colors ${isSponsor ? 'text-yellow-400' : ''}`}
              >
                {highlightText(script.owner?.fullName || script.owner?.username || '', searchQuery)}
              </Link>
              <Link
                href={`https://github.com/${script.owner?.username}`}
                className="hover:opacity-75 transition-opacity"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src={`https://github.com/${script.owner?.username}.png?size=256`}
                  alt={`${script.owner?.username}'s avatar`}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              </Link>
            </div>
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
            <Highlight theme={themes.nightOwl} code={relevantContent} language="typescript">
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <div className="relative flex flex-col h-full">
                  <pre
                    className={`${className} p-4 flex-1 ${truncate ? 'overflow-hidden' : 'overflow-y-auto'}`}
                    style={{
                      ...style,
                      margin: 0,
                      background: 'transparent',
                    }}
                  >
                    {linesBefore > 0 && <LineIndicator count={linesBefore} position="above" />}
                    {tokens.map((line, i) => {
                      const lineContent = line.map(token => token.content).join('')
                      const shouldHighlight =
                        searchQuery && lineContent.toLowerCase().includes(searchQuery.toLowerCase())

                      return (
                        <div
                          key={i}
                          {...getLineProps({ line })}
                          className={`whitespace-pre break-all ${shouldHighlight ? 'bg-amber-300/25 w-fit' : ''}`}
                        >
                          {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                          ))}
                        </div>
                      )
                    })}
                  </pre>
                  {linesAfter > 0 && (
                    <pre
                      className={`${className} px-4`}
                      style={{ background: 'transparent', margin: 0 }}
                    >
                      <LineIndicator count={linesAfter} position="below" />
                    </pre>
                  )}
                </div>
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

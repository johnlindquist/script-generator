// @ts-nocheck

import Link from 'next/link'
import Image from 'next/image'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/24/solid'
import { Prisma } from '@prisma/client'
import HighlightedCode from './HighlightedCode'

import CopyButtonClient from './CopyButtonClient'
import VerifyButtonClient from './VerifyButtonClient'
import FavoriteButtonClient from './FavoriteButtonClient'
import InstallButtonClient from './InstallButtonClient'
import DeleteButtonClient from './DeleteButtonClient'
import EditButtonClient from './EditButtonClient'
import ForkButtonClient from './ForkButtonClient'
import { FaGithub } from 'react-icons/fa'

interface ScriptCardServerProps {
  script: Prisma.ScriptGetPayload<{
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
  isAuthenticated: boolean
  currentUserId?: string
}

export default function ScriptCardServer({
  script,
  isAuthenticated,
  currentUserId,
}: ScriptCardServerProps) {
  const isOwner = currentUserId === script.owner?.id

  return (
    <article
      className={
        'w-full h-full border rounded p-5 shadow-2xl flex flex-col break-inside bg-card'
      }
      data-script-id={script.id}
    >
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex justify-between">
          <Link href={`/${script.owner?.username}/${script.id}`} className="block">
            <h3 className="text-xl font-semibold mb-2 select-text">{script.title}</h3>
          </Link>
          <Link href={`/${script.owner?.username}`} className="hover:underline transition-colors">
            <Image
              src={`https://avatars.githubusercontent.com/${script.owner?.username}?size=32`}
              alt={`${script.owner?.username}'s avatar`}
              width={32}
              height={32}
              className="rounded-full ml-2 hover:opacity-75 transition-opacity min-w-8"
            />
          </Link>
        </div>
        <div className="flex">
          <div className="text-muted-foreground text-sm flex items-center gap-2">
            {script.owner?.sponsorship && <StarIcon className="w-4 h-4 mr-1 text-amber-300" />}
            <Link href={`/${script.owner?.username}`} className="hover:underline transition-colors">
              {script.owner?.fullName || script.owner?.username}
            </Link>
            <Link
              href={`https://github.com/${script.owner?.username}`}
              className="transition-opacity"
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

      {/* Code content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="bg-background rounded h-full border">
          <HighlightedCode code={script.content} language="typescript" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap justify-between items-start gap-y-4 pt-5 flex-shrink-0">
        <div className="flex gap-2 min-w-fit">
          <CopyButtonClient content={script.content} />

          {isOwner && (
            <>
              {!script.locked && <EditButtonClient scriptId={script.id} />}
              <DeleteButtonClient scriptId={script.id} />
            </>
          )}
          {isAuthenticated && <ForkButtonClient scriptId={script.id} scriptContent={script.content} />}
        </div>

        <div className="flex gap-2 min-w-fit">
          <div className="hidden sm:block">
            <InstallButtonClient
              scriptId={script.id}
              dashedName={script.dashedName ?? ''}
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
    </article>
  )
}
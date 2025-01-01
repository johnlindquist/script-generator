'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Tooltip } from '@nextui-org/react'
import { STRINGS } from '@/lib/strings'

interface EditButtonClientProps {
  scriptId: string
}

export default function EditButtonClient({ scriptId }: EditButtonClientProps) {
  const router = useRouter()
  const { data: session } = useSession()

  const handleEdit = () => {
    router.push(`/${session?.user?.username}/${scriptId}/edit`)
  }

  return (
    <Tooltip content={STRINGS.EDIT_BUTTON.tooltip}>
      <button
        onClick={handleEdit}
        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
      </button>
    </Tooltip>
  )
}

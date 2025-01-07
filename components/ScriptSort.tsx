import { Fragment } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Menu, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid'

export type SortMode =
  | 'alphabetical'
  | 'username'
  | 'favorites'
  | 'downloads'
  | 'verified'
  | 'createdAt'

export const sortOptions = [
  { id: 'createdAt', name: 'Date Created' },
  { id: 'alphabetical', name: 'Title' },
  { id: 'username', name: 'Username' },
  { id: 'favorites', name: 'Favorites' },
  { id: 'downloads', name: 'Downloads' },
  { id: 'verified', name: 'Verifications' },
]

interface ScriptSortProps {
  sort: SortMode
  setSort: (sort: SortMode) => void
}

export default function ScriptSort({ sort, setSort }: ScriptSortProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const handleSortChange = (newSort: SortMode) => {
    setSort(newSort)
    localStorage.setItem('scriptSortMode', newSort)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('sort', newSort)
    params.set('page', '1') // Reset to first page when changing sort
    router.push(`/?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">Sort By:</span>
      <Menu as="div" className="relative w-44">
        <Menu.Button className="relative w-full cursor-pointer rounded-md bg-zinc-800 py-2 pl-3 pr-10 text-left text-sm text-gray-400 border border-zinc-700 hover:text-gray-300 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400">
          <span className="block truncate">
            {sortOptions.find(option => option.id === sort)?.name}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <MenuItems
            className="absolute z-50 origin-top-right rounded-md bg-zinc-800 py-1 text-sm shadow-lg border border-zinc-700 focus:outline-none w-[var(--button-width)]"
            anchor={{ to: 'bottom end', gap: 4 }}
          >
            {sortOptions.map(option => (
              <MenuItem key={option.id}>
                {({ active }) => (
                  <button
                    onClick={() => handleSortChange(option.id as SortMode)}
                    className={`relative w-full text-left cursor-pointer select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-zinc-700 text-amber-400' : 'text-gray-300'
                    } ${sort === option.id ? 'text-amber-400' : ''}`}
                  >
                    <span
                      className={`block truncate ${
                        sort === option.id ? 'font-medium' : 'font-normal'
                      }`}
                    >
                      {option.name}
                    </span>
                    {sort === option.id ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-400">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </button>
                )}
              </MenuItem>
            ))}
          </MenuItems>
        </Transition>
      </Menu>
    </div>
  )
}

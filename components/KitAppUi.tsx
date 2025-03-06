'use client'
import React from 'react'
import classNames from 'classnames'
import Link from 'next/link'
import useSWR from 'swr'
import type { ScriptsResponse } from '@/types'
import { ArrowDownLeft } from 'lucide-react'

const KitAppUI: React.FC<React.PropsWithChildren<any>> = ({}) => {
  const [activeScript, setActiveScript] = React.useState<ScriptsResponse['scripts'][0] | null>(null)
  const { data: scripts, isLoading: isLoadingScripts } = useSWR<ScriptsResponse>(
    `/api/scripts?page=2`,
    async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch scripts')
      const json = await res.json()
      setActiveScript(json?.scripts?.[0])
      return json
    }
  )
  return (
    <div className="cursor-default overflow-hidden flex flex-col text-left h-full lg:aspect-auto xl:scale-100 lg:scale-75 scale-50 flex-shrink-0 aspect-[600/400] max-h-[400px] w-[600px] xl:w-full xl:max-w-[600px] bg-gray-900/85 backdrop-blur-lg border rounded-lg">
      <header className="py-2.5 border-b border-white/5 flex items-center justify-between pr-4">
        <div className="flex items-center relative">
          <input
            className="px-3 placeholder-gray-400 text-lg bg-transparent w-full border-none relative before:bg-red-500 before:absolute before:left-0 before:w-1 before:h-1"
            disabled
            type="text"
            placeholder="Script Kit"
          />
        </div>
        <div className="flex items-center gap-5">
          <div className="text-sm text-yellow-500 inline-flex items-center gap-0.5">
            <span className="mr-1">Run</span>
            <span className="bg-white/10 rounded-[4px] flex items-center justify-center font-mono text-xs w-4 h-4">
              <svg
                className="w-2"
                viewBox="0 0 15 17"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 5L7.42 6.42L3.83 10H13V0H15V12H3.83L7.42 15.58L6 17L0 11L6 5Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </div>
          <div className="text-sm text-yellow-500 inline-flex items-center gap-0.5">
            <span className="mr-1">Actions</span>
            <span className="bg-white/10 rounded-[4px] flex items-center justify-center font-mono text-xs w-4 h-4">
              ⌘
            </span>
            <span className="bg-white/10 rounded-[4px] flex items-center justify-center font-mono text-xs w-4 h-4">
              K
            </span>
          </div>
          <svg
            className="w-4 text-gray-500"
            viewBox="0 0 30 25"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="14.5"
              y="19.375"
              width="15.4688"
              height="3.4375"
              rx="1.03042"
              fill="currentColor"
            />
            <path
              d="M0.75 3.20126C0.75 2.01762 2.05673 1.3003 3.05531 1.93577L17.6676 11.2345C18.5939 11.8239 18.5939 13.1761 17.6676 13.7655L3.05532 23.0642C2.05673 23.6997 0.75 22.9824 0.75 21.7987V3.20126Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </header>
      <main className="overflow-hidden grid grid-cols-2">
        {/* scripts */}
        <ul className="flex w-full sm:border-r flex-col overflow-y-scroll border-white/5 no-scrollbar">
          {isLoadingScripts &&
            new Array(10).fill(0).map((_, i) => (
              <li key={i} className="h-10 w-full p-3">
                <div className="bg-white/5 flex h-5 rounded-[5px] w-full animate-pulse" />
              </li>
            ))}
          {scripts?.scripts?.map((script: any) => {
            const isActive = activeScript?.id === script.id
            return (
              <li className={classNames({ 'bg-white/5': isActive })} key={script.id}>
                <a
                  onMouseOver={() => setActiveScript(script)}
                  className="flex flex-col px-3 py-2 bg-transparent bg-opacity-5 hover:bg-white hover:bg-opacity-5 group"
                >
                  <div>{script.title}</div>
                </a>
              </li>
            )
          })}
        </ul>
        {/* preview pane */}
        <div className="flex w-full overflow-hidden">
          <pre className="font-mono text-xs px-5 py-8 opacity-50">{activeScript?.content}</pre>
          {/* <CodeBlock
              className="font-mono w-full text-xs"
              value={
                find(scripts, {command: hovered})?.content || scripts[0].content
              }
              language="javascript"
              // @ts-ignore
              theme={theme}
            /> */}
        </div>
      </main>
    </div>
  )
}

export default KitAppUI

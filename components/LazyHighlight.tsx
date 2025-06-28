'use client'

import { memo, useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { themes } from 'prism-react-renderer'

// Lazy load the Highlight component
const Highlight = dynamic(() => import('prism-react-renderer').then(mod => mod.Highlight), {
  ssr: false,
  loading: () => <PlaceholderCode />,
})

interface LazyHighlightProps {
  code: string
  language: string
  searchQuery?: string
  className?: string
  style?: React.CSSProperties
  truncate?: boolean
  linesBefore?: number
  linesAfter?: number
}

// Placeholder component while Prism is loading
function PlaceholderCode() {
  return (
    <pre className="px-4 text-xs h-full flex flex-col overflow-y-auto bg-zinc-900 rounded">
      <div className="flex-1 min-h-0 overflow-y-hidden select-text p-4">
        <div className="animate-pulse">
          <div className="h-3 bg-zinc-800 rounded w-3/4 mb-2" />
          <div className="h-3 bg-zinc-800 rounded w-1/2 mb-2" />
          <div className="h-3 bg-zinc-800 rounded w-5/6 mb-2" />
          <div className="h-3 bg-zinc-800 rounded w-2/3" />
        </div>
      </div>
    </pre>
  )
}

interface LineIndicatorProps {
  count: number
  position: 'above' | 'below'
}

function LineIndicator({ count, position }: LineIndicatorProps) {
  return (
    <div
      className={`-mx-4 ${position === 'above' ? '' : ''} px-4 py-1 bg-amber-400/10 text-amber-300/80 text-xs border-${position === 'above' ? 'b' : 't'} border-amber-400/20 text-center`}
    >
      {count} {position === 'above' ? '' : ''}
      {count === 1 ? 'line' : 'lines'} {position} • View full script
    </div>
  )
}

export const LazyHighlight = memo(
  function LazyHighlight({
    code,
    language,
    searchQuery,
    className = '',
    style = {},
    linesBefore = 0,
    linesAfter = 0,
  }: LazyHighlightProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [, setIsHighlightLoaded] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]: IntersectionObserverEntry[]) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true)
            // Keep observing in case the component goes out of view and comes back
          }
        },
        {
          rootMargin: '100px', // Start loading 100px before visible
          threshold: 0.01, // Trigger when even 1% is visible
        }
      )

      if (ref.current) {
        observer.observe(ref.current)
      }

      return () => {
        if (ref.current) {
          observer.unobserve(ref.current)
        }
      }
    }, [isVisible])

    // Track when Highlight component is actually loaded
    useEffect(() => {
      if (isVisible && Highlight) {
        setIsHighlightLoaded(true)
      }
    }, [isVisible])

    return (
      <div ref={ref} className="h-full">
        {!isVisible ? (
          <pre
            className={`${className} px-4 text-xs h-full flex flex-col overflow-y-auto`}
            style={{
              ...style,
              margin: 0,
              background: 'transparent',
              minHeight: '100%',
              userSelect: 'text',
              WebkitUserSelect: 'text',
              cursor: 'text',
            }}
          >
            <div className="flex-1 min-h-0 overflow-y-hidden select-text">
              <code className="text-gray-300 font-mono">{code}</code>
            </div>
          </pre>
        ) : (
          <Highlight theme={themes.gruvboxMaterialDark} code={code} language={language}>
            {({
              className: highlightClassName,
              style: highlightStyle,
              tokens,
              getLineProps,
              getTokenProps,
            }) => (
              <div className="relative flex flex-col h-full">
                <pre
                  className={`${highlightClassName} ${className} px-4 text-xs h-full flex flex-col overflow-y-auto`}
                  style={{
                    ...highlightStyle,
                    ...style,
                    margin: 0,
                    background: 'transparent',
                    minHeight: '100%',
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                    cursor: 'text',
                  }}
                >
                  {linesBefore > 0 && <LineIndicator count={linesBefore} position="above" />}
                  <div className="flex-1 min-h-0 overflow-y-hidden select-text">
                    {tokens.map((line, i) => {
                      const lineContent = line.map(token => token.content).join('')
                      const shouldHighlight =
                        searchQuery && lineContent.toLowerCase().includes(searchQuery.toLowerCase())

                      return (
                        <div
                          key={i}
                          {...getLineProps({ line })}
                          className={`whitespace-pre break-all ${shouldHighlight ? 'bg-amber-300/10 border border-amber-300/40' : ''}`}
                        >
                          {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                  {linesAfter > 0 && (
                    <div className="flex-shrink-0">
                      <LineIndicator count={linesAfter} position="below" />
                    </div>
                  )}
                </pre>
              </div>
            )}
          </Highlight>
        )}
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if code, language, or searchQuery changes
    return (
      prevProps.code === nextProps.code &&
      prevProps.language === nextProps.language &&
      prevProps.searchQuery === nextProps.searchQuery &&
      prevProps.linesBefore === nextProps.linesBefore &&
      prevProps.linesAfter === nextProps.linesAfter
    )
  }
)

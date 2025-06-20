// @ts-nocheck

import React from 'react'
import Highlight, { themes, Language } from 'prism-react-renderer'

// The cache lives for the lifetime of the serverless function / node process.
// Keyed by a hash of the code + language (for our use-case language is constant).
const highlightCache = new Map<string, React.ReactElement>()

// Minimal type re-declarations to avoid bringing in the entire prism type graph.
// They align with the structures returned by prism-react-renderer.
interface Token {
  types: string[]
  content: string
  empty?: boolean
}

interface HighlightRenderProps {
  className: string
  style: React.CSSProperties
  tokens: Token[][]
  getLineProps: (input: { line: Token[]; key?: React.Key }) => React.HTMLAttributes<HTMLDivElement>
  getTokenProps: (input: { token: Token; key?: React.Key }) => React.HTMLAttributes<HTMLSpanElement>
}

interface HighlightedCodeProps {
  code: string
  language?: Language
  className?: string
  style?: React.CSSProperties
}

/**
 * Server-side syntax highlighted <pre> block.
 * Because it is rendered on the server, **no Prism or highlight JS is shipped to the client**.
 * The rendered JSX is memoised in an in-memory Map so repeated requests for the same script
 * avoid the (relatively small) Prism parsing cost.
 */
export default function HighlightedCode({
  code,
  language = 'typescript',
  className = '',
  style = {},
}: HighlightedCodeProps) {
  const cacheKey = `${language}__${code}`
  if (highlightCache.has(cacheKey)) {
    return highlightCache.get(cacheKey) as React.ReactElement
  }

  // Prism-react-renderer returns a render-prop function. We execute it immediately to obtain JSX.
  let highlightedJsx: React.ReactElement = <></>
  // We rely on the fact that the render prop runs synchronously.
  const renderHighlighted = ({
    className: highlightClassName,
    style: highlightStyle,
    tokens,
    getLineProps,
    getTokenProps,
  }: HighlightRenderProps): React.ReactElement => (
    <pre
      className={`${highlightClassName} ${className} px-4 text-xs overflow-x-auto`}
      style={{ ...highlightStyle, ...style, margin: 0, userSelect: 'text', WebkitUserSelect: 'text' }}
    >
      {tokens.map((line: Token[], lineIndex: number) => (
        <div key={`line-${lineIndex}`} {...getLineProps({ line, key: `line-${lineIndex}` })}>
          {line.map((token: Token, tokenIndex: number) => (
            <span key={`token-${lineIndex}-${tokenIndex}`} {...getTokenProps({ token, key: `token-${lineIndex}-${tokenIndex}` })} />
          ))}
        </div>
      ))}
    </pre>
  )

  highlightedJsx = (
    <Highlight theme={themes.gruvboxMaterialDark} code={code} language={language}>
      {renderHighlighted as unknown as (props: unknown) => React.ReactElement}
    </Highlight>
  )

  highlightCache.set(cacheKey, highlightedJsx)
  return highlightedJsx
}
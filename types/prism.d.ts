declare module 'prism-react-renderer' {
  import { ReactElement, CSSProperties } from 'react'

  export type Language =
    | 'javascript'
    | 'typescript'
    | 'tsx'
    | 'jsx'
    | 'bash'
    | 'json'
    | string // fallback

  export interface HighlightRenderProps {
    className: string
    style: CSSProperties
    tokens: Array<Array<{ types: string[]; content: string; empty?: boolean }>>
    getLineProps: (input: { line: string[]; key?: React.Key }) => Record<string, unknown>
    getTokenProps: (input: { token: string; key?: React.Key }) => Record<string, unknown>
  }

  export interface HighlightProps {
    code: string
    language: Language
    theme?: unknown
    children: (props: HighlightRenderProps) => ReactElement
  }

  export const themes: Record<string, unknown>
  const Highlight: (props: HighlightProps) => ReactElement
  export default Highlight
}
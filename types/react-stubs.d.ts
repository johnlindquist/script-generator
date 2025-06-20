// Minimal React & JSX stubs for type-checking without full react type package.

export namespace JSX {
  export interface IntrinsicElements {
    [elemName: string]: unknown
  }
}

declare module 'react' {
  export type ReactNode = unknown
  export type ReactElement = unknown
  export interface FC<P = Record<string, unknown>> {
    (props: P): ReactElement | null
  }
  const React: {
    createElement: (...args: unknown[]) => ReactElement
  }
  export default React
}
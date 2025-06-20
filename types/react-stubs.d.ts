// Minimal React & JSX stubs for type-checking without full react type package.

export namespace JSX {
  export interface IntrinsicElements {
    [elemName: string]: unknown
  }
}

declare module 'react' {
  export type ReactNode = unknown
  export interface FC<P = {}> {
    (props: P): ReactNode
  }
  const React: {
    createElement: (...args: unknown[]) => unknown
  }
  export default React
}
// Auto-generated lightweight React typings shim so TypeScript can compile
// even when @types/react isn't available in the environment.

export namespace JSX {
  // Allow any attribute on any element for compilation only.
  // Replace with stricter mapping if needed.
  export interface IntrinsicElements {
    [elem: string]: Record<string, unknown>
  }
}

declare module 'react' {
  export type ReactElement = unknown
  export type ReactNode = unknown

  export interface FC<P = Record<string, unknown>> {
    (props: P): ReactElement | null
  }

  const React: {
    createElement: (...args: unknown[]) => ReactElement
  }

  export default React
}
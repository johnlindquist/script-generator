// Minimal React & JSX stubs for type-checking without full react type package.

export namespace JSX {
  interface HtmlAttrs {
    [key: string]: unknown
  }

  export interface IntrinsicElements {
    div: HtmlAttrs
    span: HtmlAttrs
    a: HtmlAttrs
    img: HtmlAttrs
    pre: HtmlAttrs
    code: HtmlAttrs
    h1: HtmlAttrs
    h2: HtmlAttrs
    h3: HtmlAttrs
    p: HtmlAttrs
    button: HtmlAttrs
    input: HtmlAttrs
    svg: HtmlAttrs
    path: HtmlAttrs
    // fallback for any other element
    [elemName: string]: HtmlAttrs
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
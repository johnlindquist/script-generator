declare module 'react' {
  /** A very small subset of the React typings – enough for our TS compile step */
  export interface ReactElement<P = unknown, T extends string | JSXElementConstructor<unknown> = string | JSXElementConstructor<unknown>> {
    type: T;
    props: P;
    key: string | number | null;
  }

  export type JSXElementConstructor<P> = {
    new (props: P): unknown;
    prototype: unknown;
  } | ((props: P) => unknown);

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  export type ReactNode = ReactElement | string | number | boolean | null | undefined;

  export type Key = string | number | null

  export interface CSSProperties {
    [key: string]: string | number | null | undefined
  }

  export interface HTMLAttributes<T> {
    [key: string]: unknown
  }

  export interface FC<P = Record<string, unknown>> {
    (props: P & { children?: ReactNode }): ReactElement | null
  }

  const React: {
    createElement: (...args: unknown[]) => ReactElement;
    Fragment: unknown;
    memo: <T>(component: FC<T>) => FC<T>;
  };
  export default React;
}
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: unknown // allow any HTML / SVG tag
    }
  }
}

export {}
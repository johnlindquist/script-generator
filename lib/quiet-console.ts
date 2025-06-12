// PreventConsole in production
if (process.env.NODE_ENV === 'production') {
  const noop = () => {}
   
  ;(['log', 'info', 'debug', 'warn', 'error'] as const).forEach(method => {
    // Override console methods in production
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(console as any)[method] = noop
  })
}

export {}

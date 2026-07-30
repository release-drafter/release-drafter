export type Logger = {
  debug: (message: string) => void
  error: (message: string | Error) => void
  info: (message: string) => void
  warning: (message: string | Error) => void
}

const noop = () => {}

export const noopLogger: Logger = {
  debug: noop,
  error: noop,
  info: noop,
  warning: noop,
}

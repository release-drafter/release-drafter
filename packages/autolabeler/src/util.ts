import regexEscape from 'escape-string-regexp'
import regexParser from 'regex-parser'

export type Logger = {
  warning(message: string): void
}

export const noopLogger: Logger = {
  warning() {},
}

export const stringToRegex = (search: string) =>
  /^\/.+\/[AJUXgimsux]*$/.test(search)
    ? regexParser(search)
    : new RegExp(regexEscape(search), 'g')

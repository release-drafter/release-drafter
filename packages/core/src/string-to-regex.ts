import regexEscape from 'escape-string-regexp'
import regexParser from 'regex-parser'

export const stringToRegex = (search: string) =>
  /^\/.+\/[AJUXgimsux]*$/.test(search)
    ? regexParser(search)
    : new RegExp(regexEscape(search), 'g')

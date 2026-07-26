import regexEscape from 'escape-string-regexp'

const regexLiteral = /^\/(.+)\/([AJUXgimsux]*)$/
const supportedFlags = 'gimsuy'

export const stringToRegex = (search: string) => {
  const match = regexLiteral.exec(search)

  if (!match) {
    return new RegExp(regexEscape(search), 'g')
  }

  // Preserve regex-parser compatibility by accepting legacy flags while
  // passing only flags supported by JavaScript's RegExp constructor.
  const flags = [...new Set(match[2])]
    .filter((flag) => supportedFlags.includes(flag))
    .join('')

  return new RegExp(match[1], flags)
}

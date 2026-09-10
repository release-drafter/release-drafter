import regexEscape from 'escape-string-regexp'

const regexLiteral = /^\/.+\/[AJUXgimsux]*$/
const supportedFlags = new Set('gimsuy')

/** Converts a regex literal or plain text matcher into a regular expression. */
export const stringToRegex = (search: string) => {
  if (!regexLiteral.test(search)) return new RegExp(regexEscape(search), 'g')

  const delimiter = search.lastIndexOf('/')
  const flags = [...new Set(search.slice(delimiter + 1))]
    .filter((flag) => supportedFlags.has(flag))
    .join('')
  return new RegExp(search.slice(1, delimiter), flags)
}

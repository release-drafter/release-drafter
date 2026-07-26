import regexEscape from 'escape-string-regexp'

/**
 * Flags accepted after the closing delimiter. `A`, `J`, `U`, `X` and `x` are
 * PCRE flags that regex-parser also matched here; they are not valid in
 * JavaScript, so only the subset below reaches the RegExp constructor.
 */
const regexLiteral = /^\/(.+)\/([AJUXgimsux]*)$/
const supportedFlags = 'gimsu'

export const stringToRegex = (search: string) => {
  const match = regexLiteral.exec(search)

  if (!match) {
    return new RegExp(regexEscape(search), 'g')
  }

  // Unlike regex-parser, unsupported and repeated flags are normalized away
  // rather than handed to `new RegExp`, which would throw and make the whole
  // pattern be dropped by the caller. The pattern still compiles, so a stray
  // flag degrades to the closest valid regex instead of silently disabling a
  // replacer or autolabeler rule.
  const flags = [...new Set(match[2])]
    .filter((flag) => supportedFlags.includes(flag))
    .join('')

  return new RegExp(match[1], flags)
}

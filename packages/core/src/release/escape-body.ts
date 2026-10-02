import { fromMarkdown } from 'mdast-util-from-markdown'

/**
 * Escapes configured characters while preserving the original source of Markdown
 * code spans and blocks, including their delimiters and indentation.
 */
export const escapeBody = (
  body: string | null | undefined,
  escapes: string | undefined,
) => {
  if (!body || !escapes) return body

  const characters = new Set(escapes)
  const escapeText = (text: string) => {
    let result = ''
    let backslashes = 0
    for (const character of text) {
      if (characters.has(character)) {
        if (character === '@' || character === '#') {
          result += `${character}<!---->`
          backslashes = 0
          continue
        }
        // Preserve existing escapes. If backslashes are themselves escaped,
        // their even count still requires an escape for the next character.
        if (character === '\\' || backslashes % 2 === 0) result += '\\'
      }
      result += character
      backslashes =
        character === '\\' ? backslashes + (characters.has('\\') ? 2 : 1) : 0
    }
    return result
  }

  const tree = fromMarkdown(body)
  type Node = (typeof tree)['children'][number] | typeof tree
  let offset = 0
  let result = ''
  const visit = (node: Node) => {
    if (node.type === 'code' || node.type === 'inlineCode') {
      const start = node.position?.start.offset
      const end = node.position?.end.offset
      if (start !== undefined && end !== undefined) {
        result += escapeText(body.slice(offset, start)) + body.slice(start, end)
        offset = end
      }
    } else if ('children' in node) {
      for (const child of node.children) visit(child)
    }
  }
  visit(tree)
  return result + escapeText(body.slice(offset))
}

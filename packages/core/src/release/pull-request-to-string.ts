import regexEscape from 'escape-string-regexp'
import type { Commit, ParsedConfig } from '../types.ts'
import { generateAuthorsSentence } from './generate-contributors-sentence.ts'
import type { ChangeGroup } from './group-changes.ts'
import { applyReplacers, renderTemplate } from './render-template/index.ts'

/** Separator between the pull request numbers of `$NUMBERS`. */
const numbersSeparator = ', '

export const pullRequestToString = (params: {
  category?: string
  changes: ChangeGroup[]
  commits: Commit[]
  serverUrl: string
  config: Pick<
    ParsedConfig,
    | 'change-template'
    | 'change-title-escapes'
    | 'change-body-escapes'
    | 'replacers'
    | 'change-author-template'
    | 'change-authors-separator'
    | 'change-authors-final-separator'
  >
}) =>
  params.changes
    .map((change) => {
      const pullRequest = change.representative
      let pullAuthor = 'ghost'
      if (pullRequest.author) {
        pullAuthor =
          pullRequest.author.type === 'Bot'
            ? `[${pullRequest.author.login}[bot]](${pullRequest.author.url})`
            : pullRequest.author.login
      }
      const authorTemplate = params.config['change-author-template']

      return renderTemplate({
        template: params.config['change-template'],
        object: {
          $CATEGORY: params.category ?? '',
          $TITLE: escapeChangeText({
            text: change.title,
            escapes: params.config['change-title-escapes'],
          }),
          $NUMBER: pullRequest.number.toString(),
          $NUMBERS: change.pullRequests
            .map(({ number }) => `#${number}`)
            .join(numbersSeparator),
          $AUTHORS: generateAuthorsSentence({
            commits: params.commits,
            pullRequests: change.pullRequests,
            serverUrl: params.serverUrl,
            noAuthorsTemplate: renderTemplate({
              template: authorTemplate,
              object: {
                $AUTHOR: 'ghost',
                $AUTHOR_MENTION: '@ghost',
              },
            }),
            authorTemplate,
            authorsSeparator: params.config['change-authors-separator'],
            authorsFinalSeparator:
              params.config['change-authors-final-separator'],
          }),
          $AUTHOR: pullAuthor,
          $AUTHOR_URL: pullRequest.author?.url ?? '',
          $BODY: escapeChangeText({
            text:
              pullRequest.body == null
                ? pullRequest.body
                : applyReplacers(
                    pullRequest.body,
                    params.config.replacers,
                    'change-body',
                  ),
            escapes: params.config['change-body-escapes'],
            multiline: true,
          }),
          $URL: pullRequest.url,
          $BASE_REF_NAME: pullRequest.baseRefName,
          $HEAD_REF_NAME: pullRequest.headRefName,
        },
      })
    })
    .join('\n')

/** Escapes selected characters, skipping backtick-delimited text unless backticks are selected. */
const escapeChangeText = (params: {
  text: string | null | undefined
  escapes: string | undefined
  multiline?: boolean
}) => {
  if (params.text == null || !params.escapes) return params.text
  return params.text.replace(
    new RegExp(
      `[${regexEscape(params.escapes)}]|\`.*?\``,
      params.multiline ? 'gs' : 'g',
    ),
    (match: string, offset: number, text: string) => {
      if (match.length > 1) return match
      if (match === '@' || match === '#') return `${match}<!---->`
      // An extra backslash could make already escaped HTML hidden again.
      // Keep title behavior, and preserve existing body escapes unless
      // backslashes themselves are selected for escaping.
      if (params.multiline && !params.escapes?.includes('\\')) {
        let start = offset
        while (start > 0 && text[start - 1] === '\\') start--
        if ((offset - start) % 2 === 1) return match
      }
      return `\\${match}`
    },
  )
}

import regexEscape from 'escape-string-regexp'
import type { Config } from '../config/config.schema.ts'
import type { Commit, PullRequest } from '../types.ts'
import { generateAuthorsSentence } from './generate-contributors-sentence.ts'
import { renderTemplate } from './render-template/index.ts'

export const pullRequestToString = (params: {
  category?: string
  commits: Commit[]
  pullRequests: PullRequest[]
  serverUrl: string
  config: Pick<
    Config,
    | 'change-template'
    | 'change-title-escapes'
    | 'change-author-template'
    | 'change-authors-separator'
    | 'change-authors-final-separator'
  >
}) =>
  params.pullRequests
    .map((pullRequest) => {
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
          $TITLE: escapeTitle({
            title: pullRequest.title,
            escapes: params.config['change-title-escapes'],
          }),
          $NUMBER: pullRequest.number.toString(),
          $AUTHORS: generateAuthorsSentence({
            commits: params.commits,
            pullRequests: [pullRequest],
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
          $BODY: pullRequest.body,
          $URL: pullRequest.url,
          $BASE_REF_NAME: pullRequest.baseRefName,
          $HEAD_REF_NAME: pullRequest.headRefName,
        },
      })
    })
    .join('\n')

const escapeTitle = (params: {
  title: PullRequest['title']
  escapes: Config['change-title-escapes']
}) =>
  // If config['change-title-escapes'] contains backticks, then they will be escaped along with content contained inside backticks
  // If not, the entire backtick block is matched so that it will become a markdown code block without escaping any of its content
  params.title.replace(
    new RegExp(`[${regexEscape(params.escapes || '')}]|\`.*?\``, 'g'),
    (match: string) => {
      if (match.length > 1) return match
      if (match === '@' || match === '#') return `${match}<!---->`
      return `\\${match}`
    },
  )

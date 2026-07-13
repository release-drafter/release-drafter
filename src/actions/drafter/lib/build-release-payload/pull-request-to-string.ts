import regexEscape from 'escape-string-regexp'
import type { Config } from '../../config/index.ts'
import type { findPullRequests } from '../find-pull-requests/index.ts'
import { generateAuthorsSentence } from './generate-contributors-sentence.ts'
import { renderTemplate } from './render-template/index.ts'

type Pr = Awaited<ReturnType<typeof findPullRequests>>['pullRequests'][number]

export const pullRequestToString = (params: {
  category?: string
  commits: Awaited<ReturnType<typeof findPullRequests>>['commits']
  pullRequests: Pr[]
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
          pullRequest.author.__typename &&
          pullRequest.author.__typename === 'Bot'
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
          $BODY: pullRequest.body,
          $URL: pullRequest.url,
          $BASE_REF_NAME: pullRequest.baseRefName,
          $HEAD_REF_NAME: pullRequest.headRefName,
        },
      })
    })
    .join('\n')

const escapeTitle = (params: {
  title: Pr['title']
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

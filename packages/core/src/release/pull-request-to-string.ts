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
    | 'pr-template'
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
      const title = escapeTitle({
        title: pullRequest.title,
        escapes: params.config['change-title-escapes'],
      })

      return renderTemplate({
        template:
          params.config['pr-template'] ?? params.config['change-template'],
        object: {
          $CHANGE_TYPE: 'pull-request',
          $CHANGE_CATEGORY: params.category ?? '',
          $CHANGE_TITLE: title,
          $CHANGE_REFERENCE: `#${pullRequest.number}`,
          $CHANGE_AUTHORS: generateAuthorsSentence({
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
          $CHANGE_AUTHOR: pullAuthor,
          $CHANGE_AUTHOR_URL: pullRequest.author?.url ?? '',
          $CHANGE_BODY: pullRequest.body ?? '',
          $CHANGE_URL: pullRequest.url ?? '',
          $CHANGE_DATE: pullRequest.mergedAt ?? '',
          $PR_NUMBER: pullRequest.number.toString(),
          $PR_TITLE: title,
          $PR_BODY: pullRequest.body ?? '',
          $PR_URL: pullRequest.url ?? '',
          $PR_AUTHOR: pullAuthor,
          $PR_AUTHOR_URL: pullRequest.author?.url ?? '',
          $PR_BASE_REF_NAME: pullRequest.baseRefName ?? '',
          $PR_HEAD_REF_NAME: pullRequest.headRefName ?? '',
          $PR_MERGED_DATE: pullRequest.mergedAt ?? '',
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

import regexEscape from 'escape-string-regexp'
import { splitCommitMessage } from '../change.ts'
import type { Config } from '../config/config.schema.ts'
import type { Change, Commit, CommitAuthor } from '../types.ts'
import { generateAuthorsSentence } from './generate-contributors-sentence.ts'
import { renderTemplate } from './render-template/index.ts'

type ChangeConfig = Pick<
  Config,
  | 'change-template'
  | 'pr-template'
  | 'commit-template'
  | 'change-title-escapes'
  | 'change-author-template'
  | 'change-authors-separator'
  | 'change-authors-final-separator'
>

const escapeTitle = (title: string, escapes: string | undefined) =>
  title.replace(
    new RegExp(`[${regexEscape(escapes || '')}]|\`.*?\``, 'g'),
    (match) => {
      if (match.length > 1) return match
      if (match === '@' || match === '#') return `${match}<!---->`
      return `\\${match}`
    },
  )

const commitAuthorName = (author: CommitAuthor | null | undefined) => {
  if (!author) return 'ghost'
  return author.login ?? author.name ?? 'ghost'
}

export const changeToString = (params: {
  categoryTitle?: string
  changes: Change[]
  commits: Commit[]
  serverUrl: string
  config: ChangeConfig
}) =>
  params.changes
    .map((change) => {
      const authorTemplate = params.config['change-author-template']
      const authors = generateAuthorsSentence({
        commits: params.commits,
        pullRequests:
          change.type === 'pull-request' ? [change.pullRequest] : [],
        directCommits: change.type === 'commit' ? [change.commit] : [],
        serverUrl: params.serverUrl,
        noAuthorsTemplate: renderTemplate({
          template: authorTemplate,
          object: {
            $AUTHOR: 'ghost',
            $AUTHOR_MENTION: '@ghost',
            $AUTHOR_URL: '',
          },
        }),
        authorTemplate,
        authorsSeparator: params.config['change-authors-separator'],
        authorsFinalSeparator: params.config['change-authors-final-separator'],
      })

      if (change.type === 'pull-request') {
        const { pullRequest } = change
        const author = pullRequest.author
          ? pullRequest.author.type === 'Bot'
            ? `[${pullRequest.author.login}[bot]](${pullRequest.author.url})`
            : pullRequest.author.login
          : 'ghost'
        const authorUrl = pullRequest.author?.url ?? ''
        const title = escapeTitle(
          pullRequest.title,
          params.config['change-title-escapes'],
        )
        return renderTemplate({
          template:
            params.config['pr-template'] ?? params.config['change-template'],
          object: {
            $CHANGE_TYPE: 'pull-request',
            $CHANGE_CATEGORY: params.categoryTitle ?? '',
            $CHANGE_TITLE: title,
            $CHANGE_BODY: pullRequest.body ?? '',
            $CHANGE_URL: pullRequest.url ?? '',
            $CHANGE_REFERENCE: `#${pullRequest.number}`,
            $CHANGE_AUTHOR: author,
            $CHANGE_AUTHOR_URL: authorUrl,
            $CHANGE_AUTHORS: authors,
            $CHANGE_DATE: pullRequest.mergedAt ?? '',
            $PR_NUMBER: pullRequest.number,
            $PR_TITLE: title,
            $PR_BODY: pullRequest.body ?? '',
            $PR_URL: pullRequest.url ?? '',
            $PR_AUTHOR: author,
            $PR_AUTHOR_URL: authorUrl,
            $PR_BASE_REF_NAME: pullRequest.baseRefName ?? '',
            $PR_HEAD_REF_NAME: pullRequest.headRefName ?? '',
            $PR_MERGED_DATE: pullRequest.mergedAt ?? '',
          },
        })
      }

      const { commit } = change
      const message = splitCommitMessage(commit.message)
      const author = commitAuthorName(commit.author)
      const authorUrl = commit.author?.url ?? ''
      const title = escapeTitle(
        message.title || commit.oid,
        params.config['change-title-escapes'],
      )
      const shortSha = commit.oid.slice(0, 7)
      const reference = commit.url
        ? `[\`${shortSha}\`](${commit.url})`
        : `\`${shortSha}\``
      return renderTemplate({
        template:
          params.config['commit-template'] ?? params.config['change-template'],
        object: {
          $CHANGE_TYPE: 'commit',
          $CHANGE_CATEGORY: params.categoryTitle ?? '',
          $CHANGE_TITLE: title,
          $CHANGE_BODY: message.body,
          $CHANGE_URL: commit.url ?? '',
          $CHANGE_REFERENCE: reference,
          $CHANGE_AUTHOR: author,
          $CHANGE_AUTHOR_URL: authorUrl,
          $CHANGE_AUTHORS: authors,
          $CHANGE_DATE: commit.committedAt ?? '',
          $COMMIT_SHA: commit.oid,
          $COMMIT_SHA_SHORT: shortSha,
          $COMMIT_TITLE: title,
          $COMMIT_BODY: message.body,
          $COMMIT_MESSAGE: commit.message ?? '',
          $COMMIT_URL: commit.url ?? '',
          $COMMIT_AUTHOR: author,
          $COMMIT_AUTHOR_URL: authorUrl,
          $COMMIT_AUTHORED_DATE: commit.authoredAt ?? '',
          $COMMIT_COMMITTED_DATE: commit.committedAt ?? '',
        },
      })
    })
    .join('\n')

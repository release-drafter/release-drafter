import regexEscape from 'escape-string-regexp'
import { splitCommitMessage } from '../change.ts'
import type { Change, Commit, CommitAuthor, ParsedConfig } from '../types.ts'
import { generateAuthorsSentence } from './generate-contributors-sentence.ts'
import type { ChangeGroup } from './group-changes.ts'
import { applyReplacers, renderTemplate } from './render-template/index.ts'

type ChangeConfig = Pick<
  ParsedConfig,
  | 'change-template'
  | 'pr-template'
  | 'commit-template'
  | 'change-title-escapes'
  | 'change-body-escapes'
  | 'replacers'
  | 'change-authors-exclude-bots'
  | 'change-author-template'
  | 'change-authors-separator'
  | 'change-authors-final-separator'
>

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

export type ChangelogChange = Change & { group?: ChangeGroup }

const commitAuthorName = (author: CommitAuthor | null | undefined) => {
  if (!author) return 'ghost'
  return author.login ?? author.name ?? 'ghost'
}

export const changeToString = (params: {
  categoryTitle?: string
  changes: ChangelogChange[]
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
          change.type === 'pull-request'
            ? (change.group?.pullRequests ?? [change.pullRequest])
            : [],
        directCommits: change.type === 'commit' ? [change.commit] : [],
        serverUrl: params.serverUrl,
        excludeBots: params.config['change-authors-exclude-bots'],
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

      const renderText = (
        text: string,
        target: 'change-title' | 'change-body',
      ) =>
        escapeChangeText({
          text: applyReplacers(text, params.config.replacers, target),
          escapes:
            params.config[
              target === 'change-title'
                ? 'change-title-escapes'
                : 'change-body-escapes'
            ],
          multiline: target === 'change-body',
        })

      if (change.type === 'pull-request') {
        const { pullRequest } = change
        const author = pullRequest.author
          ? pullRequest.author.type === 'Bot'
            ? `[${pullRequest.author.login}[bot]](${pullRequest.author.url})`
            : pullRequest.author.login
          : 'ghost'
        const authorUrl = pullRequest.author?.url ?? ''
        const title = renderText(
          change.group?.title ?? pullRequest.title,
          'change-title',
        )
        const hasSectionRule = params.config.replacers.some(
          (rule) => rule.target === 'change-body' && rule.section !== undefined,
        )
        const body =
          pullRequest.body == null && !hasSectionRule
            ? ''
            : renderText(pullRequest.body ?? '', 'change-body')
        return renderTemplate({
          template:
            params.config['pr-template'] ?? params.config['change-template'],
          object: {
            $CHANGE_TYPE: 'pull-request',
            $CHANGE_CATEGORY: params.categoryTitle ?? '',
            $CHANGE_TITLE: title,
            $CHANGE_BODY: body,
            $CHANGE_URL: pullRequest.url ?? '',
            $CHANGE_REFERENCE: `#${pullRequest.number}`,
            $CHANGE_AUTHOR: author,
            $CHANGE_AUTHOR_URL: authorUrl,
            $CHANGE_AUTHORS: authors,
            $CHANGE_DATE: pullRequest.mergedAt ?? '',
            $PR_NUMBER: pullRequest.number,
            $PR_NUMBERS: (change.group?.pullRequests ?? [pullRequest])
              .map(({ number }) => `#${number}`)
              .join(', '),
            $PR_TITLE: title,
            $PR_BODY: body,
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
      const title = renderText(message.title || commit.oid, 'change-title')
      const body = renderText(message.body, 'change-body')
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
          $CHANGE_BODY: body,
          $CHANGE_URL: commit.url ?? '',
          $CHANGE_REFERENCE: reference,
          $CHANGE_AUTHOR: author,
          $CHANGE_AUTHOR_URL: authorUrl,
          $CHANGE_AUTHORS: authors,
          $CHANGE_DATE: commit.committedAt ?? '',
          $COMMIT_SHA: commit.oid,
          $COMMIT_SHA_SHORT: shortSha,
          $COMMIT_TITLE: title,
          $COMMIT_BODY: body,
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

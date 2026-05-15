import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import * as github from '@actions/github'
import type { WebhookPayload } from 'node_modules/@actions/github/lib/interfaces'
import { expect, vi } from 'vitest'
import type { GithubActionEnvironment } from '#src/types/index.ts'

type AllowedPayload =
  | 'push'
  | 'push-non-master-branch'
  | 'push-tag'
  | 'pull_request-synchronize'

const getEventPayloadPath = (type: AllowedPayload) => {
  const baseDir = path.join(
    path.dirname(import.meta.filename),
    '../fixtures',
    'events',
  )
  return path.join(baseDir, `${type}.json`)
}

/**
 * Mocking GitHub Action environment variables for testing.
 *
 * The defined environments variabesl will determine the behavior of `@actions/github`
 * when it is imported, so this function should be called before importing
 * modules that depend on it.
 */
export const mockContext = async (desiredPayload: AllowedPayload) => {
  let payload: WebhookPayload
  const defaultEnv: GithubActionEnvironment = {
    CI: 'true',
    GITHUB_ACTION: 'release-drafter',
    GITHUB_ACTION_PATH: '',
    GITHUB_ACTION_REPOSITORY: 'toolmantim/release-drafter-test-project',
    GITHUB_ACTIONS: 'false',
    GITHUB_ACTOR: 'toolmantim',
    GITHUB_ACTOR_ID: '153',
    GITHUB_API_URL: 'https://api.github.com',
    GITHUB_BASE_REF: 'master',
    GITHUB_ENV: '',
    GITHUB_EVENT_NAME: 'push',
    GITHUB_EVENT_PATH: '__fixtures__/events/push.json',
    GITHUB_GRAPHQL_URL: 'https://api.github.com/graphql',
    GITHUB_HEAD_REF: '',
    GITHUB_JOB: 'release_drafter_job',
    GITHUB_OUTPUT: '',
    GITHUB_PATH: '',
    GITHUB_REF: 'refs/heads/master',
    GITHUB_REF_NAME: 'master',
    GITHUB_REF_PROTECTED: 'true',
    GITHUB_REF_TYPE: 'branch',
    GITHUB_REPOSITORY: 'toolmantim/release-drafter-test-project',
    GITHUB_REPOSITORY_ID: '133810100',
    GITHUB_REPOSITORY_OWNER: 'toolmantim',
    GITHUB_REPOSITORY_OWNER_ID: '153',
    GITHUB_RETENTION_DAYS: '',
    GITHUB_RUN_ATTEMPT: '1',
    GITHUB_RUN_ID: '1658821493',
    GITHUB_RUN_NUMBER: '1',
    GITHUB_SERVER_URL: 'https://github.com',
    GITHUB_SHA: '1496a1f82f32f240f7cbe1a42eb0b0c7a06a5093',
    GITHUB_STEP_SUMMARY: '',
    GITHUB_TRIGGERING_ACTOR: 'toolmantim',
    GITHUB_WORKFLOW: 'Release Drafter Workflow',
    GITHUB_WORKFLOW_REF:
      'toolmantim/release-drafter-test-project/.github/workflows/my-workflow.yml@refs/heads/my_branch',
    GITHUB_WORKFLOW_SHA: 'aa80724a5d394e0cadaeb0488c488fe21922d6ff',
    GITHUB_WORKSPACE: '.',
    RUNNER_ARCH: '',
    RUNNER_DEBUG: '1',
    RUNNER_NAME: '',
    RUNNER_OS: 'Linux',
    RUNNER_TEMP: '',
    RUNNER_TOOL_CACHE: '',
    ACTIONS_STEP_DEBUG: 'true',
    INPUT_MILLISECONDS: '2400',
  }

  const pathToPayload = getEventPayloadPath(desiredPayload)

  if (existsSync(pathToPayload)) {
    payload = JSON.parse(readFileSync(pathToPayload, { encoding: 'utf8' }))
  } else {
    throw new Error('Event payload path does not exist')
  }

  /**
   * Some environment variables are related to the payload's content.
   */
  const envFromPayload: Partial<GithubActionEnvironment> = {
    GITHUB_ACTION_REPOSITORY: payload.repository?.full_name,
    GITHUB_ACTOR: payload.pusher?.login,
    GITHUB_ACTOR_ID: payload.sender?.id?.toString(),
    GITHUB_BASE_REF: desiredPayload.startsWith('pull_request')
      ? payload.pull_request?.base?.ref
      : undefined,
    GITHUB_EVENT_NAME: desiredPayload.startsWith('pull_request')
      ? 'pull_request'
      : 'push',
    GITHUB_EVENT_PATH: pathToPayload,
    GITHUB_REF: payload.ref,
    GITHUB_REF_NAME: desiredPayload.startsWith('pull_request')
      ? `refs/pull/${payload.number}/merge`
      : payload.ref.replace(/^refs\/heads\//, ''),
    GITHUB_REF_TYPE: desiredPayload === 'push-tag' ? 'tag' : 'branch',
    GITHUB_REPOSITORY: payload.repository?.full_name,
    GITHUB_REPOSITORY_ID: payload.repository?.id?.toString(),
    GITHUB_REPOSITORY_OWNER: payload.repository?.owner?.login,
    GITHUB_REPOSITORY_OWNER_ID: payload.repository?.owner?.id?.toString(),
    GITHUB_SHA: payload.after,
    GITHUB_TRIGGERING_ACTOR: payload.pusher?.login,
    GITHUB_WORKSPACE: path.resolve(
      path.dirname(import.meta.filename),
      '../../..',
    ),
  }

  Object.entries({
    ...defaultEnv,
    ...envFromPayload,
  })
    .filter(([key, value]) => value !== undefined && value !== null && !!key)
    .forEach(([key, value]) => {
      vi.stubEnv(key, value)
    })

  // Context class is not explicitly exported by @actions/github
  const newContext = new (
    await import('node_modules/@actions/github/lib/context')
  ).Context()

  // Hack to change github.context despite being read-only - @actions/github has side effects on import that need to be re-initialized
  Object.keys(github.context).forEach((contextKey) => {
    const k = contextKey as keyof typeof github.context
    const newValue = newContext[k]

    if (k in github.context) {
      // @ts-expect-error - please let me do my thing typescript thank you
      github.context[k] = newValue
    } else {
      delete github.context[k]
    }
  })

  // Verify the context has been set up correctly
  const dynamicContext = (await import('@actions/github')).context
  expect(dynamicContext.ref).toEqual(process.env.GITHUB_REF)
  expect(dynamicContext.payload).toEqual(payload)
}

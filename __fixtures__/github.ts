import { existsSync, readFileSync } from 'fs'
import path from 'path'
import {
  // Imported for type definition only
  type context,
  // Tests mock the actual http calls made by Octokit, mocking it would be redundant
  getOctokit
} from '@actions/github'

type Context = typeof context

const getEventPayloadPath = (type: 'push') => {
  const baseDir = path.join(path.dirname(import.meta.filename), 'events')
  switch (type) {
    case 'push':
      return path.join(baseDir, `${type}.json`)
    default:
      throw new Error(`Unsupported event type: ${type}`)
  }
}

/**
 * @param params Parameters to customize the github context mock.
 *
 * @param params.payload is expected to by typed according to types from `@octokit/webhooks-types`
 * some payloads are avalable in `__fixtures__/events/[payload-slug].json`,
 * and available using `payload: '[payload-slug]'` instead of an object.
 *
 * @returns A mock of the `@actions/github` module
 */
export const getGithubMock: (
  params: Partial<Pick<Context, 'sha' | 'ref' | 'repo'>> &
    Pick<Context, 'eventName'> & { payload: 'push' | object }
) => typeof import('@actions/github') = (params) => {
  const repo = params.repo || {
    owner: 'release-drafter',
    repo: 'release-drafter'
  }

  let payload: object

  if (typeof params.payload === 'string') {
    const pathToPayload = getEventPayloadPath(params.payload)
    if (existsSync(pathToPayload)) {
      payload = JSON.parse(readFileSync(pathToPayload, { encoding: 'utf8' }))
    } else {
      throw new Error('Event payload path does not exist')
    }
  } else {
    payload = params.payload
  }

  return {
    getOctokit,
    context: {
      repo,
      issue: { ...repo, number: 123 },
      ref: params.ref ?? 'refs/heads/some-ref',
      sha: params.sha ?? '1234567890123456789012345678901234567890',
      action: 'release-drafter',
      eventName: params.eventName,
      payload,
      workflow: 'My jest workflow',
      actor: 'jest[bot]',
      job: 'jest-test-job',
      runAttempt: 3,
      runNumber: 2,
      runId: 1658821493,
      apiUrl: `https://api.github.com`,
      serverUrl: `https://github.com`,
      graphqlUrl: `https://api.github.com/graphql`
    }
  }
}

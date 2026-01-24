import { existsSync, readFileSync } from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import type { GithubActionEnvironment } from 'src/types'

import type { WebhookPayload } from '@actions/github/lib/interfaces'
import { expect, vi } from 'vitest'

import github from '@actions/github'

type AllowedPayload = 'push' | 'push-non-master-branch' | 'push-tag'

const getEventPayloadPath = (type: AllowedPayload) => {
  const baseDir = path.join(
    path.dirname(import.meta.filename),
    '../fixtures',
    'events'
  )
  return path.join(baseDir, `${type}.json`)
}

const getExampleEnvPath = () =>
  path.join(path.dirname(import.meta.filename), '../../../', '.env.example')

/**
 * Mocking GitHub Action environment variables for testing.
 *
 * The defined environments variabesl will determine the behavior of `@actions/github`
 * when it is imported, so this function should be called before importing
 * modules that depend on it.
 */
export const mockContext = async (desiredPayload: AllowedPayload) => {
  let payload: WebhookPayload
  let defaultEnv: GithubActionEnvironment

  const pathToPayload = getEventPayloadPath(desiredPayload)
  const pathToDefaultEnv = getExampleEnvPath()

  if (existsSync(pathToPayload)) {
    payload = JSON.parse(readFileSync(pathToPayload, { encoding: 'utf8' }))
  } else {
    throw new Error('Event payload path does not exist')
  }

  if (existsSync(pathToDefaultEnv)) {
    defaultEnv = dotenv.parse(
      readFileSync(pathToDefaultEnv, { encoding: 'utf8' })
    )
  } else {
    throw new Error('Default env path does not exist')
  }

  /**
   * Some environment variables are related to the payload's content.
   */
  const envFromPayload: Partial<GithubActionEnvironment> = {
    GITHUB_ACTION_REPOSITORY: payload.repository?.full_name,
    GITHUB_ACTOR: payload.pusher?.login,
    GITHUB_ACTOR_ID: payload.sender?.id?.toString(),
    GITHUB_BASE_REF: payload.ref.replace(/^refs\/heads\//, ''),
    GITHUB_EVENT_NAME: 'push', // since only 'push' payloads are supported for now
    GITHUB_EVENT_PATH: pathToPayload,
    GITHUB_REF: payload.ref,
    GITHUB_REF_NAME: payload.ref.replace(/^refs\/heads\//, ''),
    GITHUB_REF_TYPE: desiredPayload === 'push-tag' ? 'tag' : 'branch',
    GITHUB_REPOSITORY: payload.repository?.full_name,
    GITHUB_REPOSITORY_ID: payload.repository?.id?.toString(),
    GITHUB_REPOSITORY_OWNER: payload.repository?.owner?.login,
    GITHUB_REPOSITORY_OWNER_ID: payload.repository?.owner?.id?.toString(),
    GITHUB_SHA: payload.after,
    GITHUB_TRIGGERING_ACTOR: payload.pusher?.login,
    GITHUB_WORKSPACE: path.resolve(
      path.dirname(import.meta.filename),
      '../../..'
    )
  }

  Object.entries({
    ...defaultEnv,
    ...envFromPayload
  })
    .filter(([key, value]) => value !== undefined && value !== null && !!key)
    .forEach(([key, value]) => {
      vi.stubEnv(key, value)
    })

  // @ts-expect-error - @actions/github has side effects on import that need to be re-initialized
  github.context = new (await import('@actions/github/lib/context')).Context() // reads from env

  // Verify the context has been set up correctly
  const dynamicContext = (await import('@actions/github')).context
  expect(dynamicContext.ref).toEqual(process.env.GITHUB_REF)
  expect(dynamicContext.ref).toEqual(payload.ref)
  expect(dynamicContext.payload).toEqual(payload)
}

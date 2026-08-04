import type { TestProject } from 'vitest/node'
import { type GitLabFixture, startGitLabFixture } from './gitlab-fixture.ts'

export type ProvidedGitLabFixture = Pick<
  GitLabFixture,
  'token' | 'serverUrl' | 'repository' | 'conformance' | 'configPath'
>

declare module 'vitest' {
  interface ProvidedContext {
    gitlabFixture: ProvidedGitLabFixture
  }
}

export default async ({ provide }: TestProject) => {
  const fixture = await startGitLabFixture()
  provide('gitlabFixture', {
    token: fixture.token,
    serverUrl: fixture.serverUrl,
    repository: fixture.repository,
    conformance: fixture.conformance,
    configPath: fixture.configPath,
  })
  console.log(`GitLab CE ready at ${fixture.serverUrl}`)
  return () => fixture.stop()
}

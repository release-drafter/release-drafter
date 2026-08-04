import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'

const read = (path: string) => readFileSync(path, 'utf8')

type Workflow = {
  on?: Record<string, unknown>
  permissions?: Record<string, string>
  jobs?: Record<
    string,
    {
      timeout?: number
      'timeout-minutes'?: number
      strategy?: {
        matrix?: { forge?: string[] }
      }
      steps?: Array<{
        uses?: string
        run?: string
        if?: string
        'timeout-minutes'?: number
        with?: Record<string, unknown>
      }>
    }
  >
}

describe('GitLab integration structure', () => {
  it('pins the GitLab CE image and bootstraps a real nested fixture', () => {
    const fixture = read('src/tests/integration/gitlab/gitlab-fixture.ts')

    expect(fixture).toContain(
      'gitlab/gitlab-ce:19.1.3-ce.0@sha256:d160bc91d3a112fdcaead0ecd76076e3371677c1314f266d9c26b5c3d3363db1',
    )
    expect(fixture).toContain(
      'Wait.forSuccessfulCommand(\n            "curl --fail --silent http://127.0.0.1/-/health',
    )
    expect(fixture).toContain('/-/readiness?all=1')
    expect(fixture).toContain("gitlab-rails', 'runner'")
    expect(fixture).toContain('PersonalAccessToken.new')
    expect(fixture).toContain("path: 'nested-fixtures'")
    expect(fixture).toContain("path: 'forge-conformance'")
    expect(fixture).toContain('/repository/commits')
    expect(fixture).toContain('/merge_requests')
    expect(fixture).toContain('/releases')
    expect(fixture).toContain('.withLogConsumer(')
    expect(fixture).toContain('createSecretRedactor([rootPassword, token])')
    expect(fixture).toContain('await finished(logWriter)')
    expect(fixture).not.toContain('copyArchiveFromContainer')
    expect(fixture).not.toMatch(/\.(?:skip|skipIf)\s*\(/)
  })

  it('keeps the heavy suite isolated, serial, and extended-timeout', () => {
    const config = read('vitest.gitlab.config.ts')
    const rootConfig = read('vite.config.ts')

    expect(config).toContain('src/tests/integration/gitlab/**/*.test.ts')
    expect(config).toContain('coverage: { enabled: false }')
    expect(config).toContain('minWorkers: 1')
    expect(config).toContain('maxWorkers: 1')
    expect(config).toContain('fileParallelism: false')
    expect(config).toContain('sequence: { concurrent: false }')
    expect(config).toContain('hookTimeout: 20 * 60_000')
    expect(config).toContain("exclude: ['**/node_modules/**', '**/dist/**']")
    expect(config).not.toContain('**/*.container.test.ts')
    expect(config).not.toContain('src/tests/setup.ts')
    expect(rootConfig).toContain("'**/*.container.test.ts'")
  })

  it('runs GitLab in the normal forge matrix with failure logs', () => {
    expect(existsSync('.github/workflows/gitlab-integration.yml')).toBe(false)

    const contents = read('.github/workflows/ci.yml')
    const workflow = parseYaml(contents) as Workflow
    const job = workflow.jobs?.['forge-conformance']
    const steps = job?.steps ?? []

    expect(job?.['timeout-minutes']).toBe(30)
    expect(job?.strategy?.matrix?.forge).toEqual(['gitea', 'forgejo', 'gitlab'])
    expect(contents).not.toContain('pull_request_target')
    expect(contents).not.toMatch(/secrets\./)
    expect(contents).not.toMatch(/continue-on-error:\s*true/)

    const matrixCommand = [
      'npm run test:conformance:',
      '$',
      '{{ matrix.forge }}',
    ].join('')
    expect(steps.find(({ run }) => run === matrixCommand)).toBeDefined()
    const upload = steps.find(({ uses }) =>
      uses?.startsWith('actions/upload-artifact@'),
    )
    expect(upload?.if).toBe("failure() && matrix.forge == 'gitlab'")
    expect(upload?.with).toMatchObject({
      path: 'artifacts/gitlab',
      'if-no-files-found': 'warn',
      'retention-days': 7,
    })
  })
})

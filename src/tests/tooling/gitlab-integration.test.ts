import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'

const read = (path: string) => readFileSync(path, 'utf8')
const githubExpression = (expression: string) =>
  ['$', `{{ ${expression} }}`].join('')

type Workflow = {
  on?: {
    pull_request?: { types?: string[] } | null
    push?: { branches?: string[] }
  }
  permissions?: Record<string, string>
  jobs?: Record<
    string,
    {
      name?: string
      needs?: string | string[]
      if?: string
      outputs?: Record<string, string>
      timeout?: number
      'timeout-minutes'?: number
      strategy?: {
        matrix?: { forge?: string[] }
      }
      steps?: Array<{
        id?: string
        name?: string
        uses?: string
        run?: string
        shell?: string
        if?: string
        env?: Record<string, string>
        'timeout-minutes'?: number
        with?: Record<string, unknown>
      }>
    }
  >
}

describe('forge conformance workflow', () => {
  it('isolates conditional forge routing in its own workflow', () => {
    const ci = parseYaml(read('.github/workflows/ci.yml')) as Workflow
    const contents = read('.github/workflows/forge-conformance.yml')
    const workflow = parseYaml(contents) as Workflow
    const jobs = workflow.jobs ?? {}
    const scope = jobs['forge-conformance-scope']
    const matrix = jobs['forge-conformance']
    const gate = jobs['forge-conformance-gate']
    const scopeStep = scope?.steps?.find(({ id }) => id === 'scope')
    const gateSteps = gate?.steps ?? []
    const gateStep = gateSteps.find(
      ({ run }) => run === 'node src/scripts/forge-conformance-gate.ts',
    )

    expect(ci.on?.pull_request).toBeNull()
    expect(ci.on?.push?.branches).toEqual(['main'])
    expect(ci.jobs?.['forge-conformance']).toBeUndefined()

    expect(workflow.on?.pull_request?.types).toEqual([
      'opened',
      'synchronize',
      'reopened',
      'labeled',
    ])
    expect(workflow.on?.push?.branches).toEqual(['main'])
    expect(workflow.permissions).toEqual({ contents: 'read' })
    expect(scope?.outputs?.['should-run']).toBe(
      githubExpression('steps.scope.outputs.should-run'),
    )
    expect(scopeStep?.env).toMatchObject({
      EVENT_NAME: githubExpression('github.event_name'),
      EVENT_ACTION: githubExpression('github.event.action'),
      LABEL_NAME: githubExpression('github.event.label.name'),
      OVERRIDE_LABEL: 'ci:forge-conformance',
      HAS_OVERRIDE_LABEL: githubExpression(
        "github.event_name == 'pull_request' && contains(github.event.pull_request.labels.*.name, 'ci:forge-conformance')",
      ),
      PR_BASE_SHA: githubExpression('github.event.pull_request.base.sha'),
      PUSH_BEFORE_SHA: githubExpression('github.event.before'),
    })
    expect(scopeStep?.run).toBe('node src/scripts/forge-conformance-router.ts')

    expect(matrix?.needs).toBe('forge-conformance-scope')
    expect(matrix?.if).toBe(
      "needs.forge-conformance-scope.outputs.should-run == 'true'",
    )
    expect(gate).toMatchObject({
      name: 'Forge conformance',
      needs: ['forge-conformance-scope', 'forge-conformance'],
      if: 'always()',
    })
    expect(gateStep).toMatchObject({
      env: {
        SCOPE_RESULT: githubExpression('needs.forge-conformance-scope.result'),
        SHOULD_RUN: githubExpression(
          'needs.forge-conformance-scope.outputs.should-run',
        ),
        MATRIX_RESULT: githubExpression('needs.forge-conformance.result'),
      },
      run: 'node src/scripts/forge-conformance-gate.ts',
    })
  })

  it('runs the dedicated forge matrix with failure logs', () => {
    const contents = read('.github/workflows/forge-conformance.yml')
    const workflow = parseYaml(contents) as Workflow
    const job = workflow.jobs?.['forge-conformance']
    const steps = job?.steps ?? []

    expect(job?.['timeout-minutes']).toBe(30)
    expect(job?.strategy?.matrix?.forge).toEqual(['gitea', 'forgejo', 'gitlab'])
    expect(contents).not.toContain('pull_request_target')
    expect(contents).not.toMatch(/secrets\./)
    expect(contents).not.toMatch(/continue-on-error:\s*true/)

    const matrixCommand = `npm run test:conformance:${githubExpression('matrix.forge')}`
    expect(steps.find(({ run }) => run === matrixCommand)).toBeDefined()
    const upload = steps.find(({ uses }) =>
      uses?.startsWith('actions/upload-artifact@'),
    )
    expect(upload?.if).toBe('failure()')
    expect(upload?.with).toMatchObject({
      name: `${githubExpression('matrix.forge')}-integration-logs`,
      path: `artifacts/${githubExpression('matrix.forge')}`,
      'if-no-files-found': 'warn',
      'retention-days': 7,
    })
  })
})

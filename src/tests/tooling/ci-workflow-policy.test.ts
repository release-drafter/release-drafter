import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const workflow = parse(readFileSync('.github/workflows/ci.yml', 'utf8'))

describe('combined CI workflow policy', () => {
  it.each([
    ['pull_request', 'opened', 'refs/pull/1/merge', true, true],
    ['pull_request', 'synchronize', 'refs/pull/1/merge', true, true],
    ['pull_request', 'reopened', 'refs/pull/1/merge', true, true],
    ['push', '', 'refs/heads/main', true, true],
    ['push', '', 'refs/heads/ci/gitlab-startup', true, true],
    ['workflow_dispatch', '', 'refs/heads/main', true, false],
  ])(
    'routes %s/%s/%s to the intended jobs',
    (event, action, ref, checks, forge) => {
      const github = { event_name: event, event: { action }, ref }
      for (const job of [
        'tests',
        'action-smoke-tests',
        'actionlint',
        'package-readiness',
      ]) {
        expect(
          runInNewContext(workflow.jobs[job].if ?? 'true', { github }),
        ).toBe(checks)
      }
      expect(
        runInNewContext(workflow.jobs['forge-conformance-scope'].if, {
          github,
        }),
      ).toBe(forge)
    },
  )

  it('uses PR source branches without label triggers', () => {
    expect(workflow.on).toHaveProperty('pull_request', null)
    const scope = workflow.jobs['forge-conformance-scope'].steps.find(
      (step: { id?: string }) => step.id === 'scope',
    )
    expect(scope.env.HEAD_REF).toBe(`\${{ github.head_ref }}`)
    expect(JSON.stringify(scope.env)).not.toContain('LABEL')
  })

  it('keeps manual runs separate and forge failures visible', () => {
    const expression = workflow.concurrency.group
    const group = (event: string, action: string) =>
      expression.replace(/\$\{\{(.*?)\}\}/gu, (_: string, source: string) =>
        String(
          runInNewContext(source, {
            github: {
              workflow: 'CI',
              event_name: event,
              event: { action, pull_request: { number: 1 } },
              ref: 'refs/heads/main',
            },
          }),
        ),
      )
    expect(group('workflow_dispatch', '')).not.toBe(group('push', ''))
    expect(workflow.jobs['forge-conformance'].strategy['fail-fast']).toBe(false)
  })
})

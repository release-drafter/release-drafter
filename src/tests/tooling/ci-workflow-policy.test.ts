import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vite-plus/test'
import { parse } from 'yaml'

const workflow = parse(readFileSync('.github/workflows/ci.yml', 'utf8'))

describe('combined CI workflow policy', () => {
  it('uses pinned Vite+ setup while preserving installed-dependency caches', () => {
    for (const job of [
      workflow.jobs.tests,
      workflow.jobs['forge-conformance'],
    ]) {
      const setup = job.steps.find((step: { uses?: string }) =>
        step.uses?.startsWith('voidzero-dev/setup-vp@'),
      )
      expect(setup.uses).toMatch(/^voidzero-dev\/setup-vp@[a-f0-9]{40}$/u)
      expect(setup.with).toEqual({
        'version-file': 'package.json',
        'node-version-file': '.node-version',
        'run-install': false,
        cache: false,
      })
      const install = job.steps.find(
        (step: { run?: string }) => step.run === 'vp install --frozen-lockfile',
      )
      expect(install.if).toBe("steps.node-modules.outputs.cache-hit != 'true'")
      expect(
        job.steps.find((step: { id?: string }) => step.id === 'node-modules'),
      ).toBeDefined()
    }
  })

  it('installs with frozen lockfiles in simple setup-vp workflows', () => {
    const jobs = [
      workflow.jobs['package-readiness'],
      ...['release', 'npm-publish', 'codegen', 'licensed'].flatMap((name) =>
        Object.values(
          parse(readFileSync(`.github/workflows/${name}.yml`, 'utf8')).jobs,
        ),
      ),
    ] as Array<{
      steps: Array<{
        uses?: string
        run?: string
        with?: Record<string, unknown>
      }>
    }>
    const setups = jobs.flatMap((job) =>
      job.steps.filter((step) =>
        step.uses?.startsWith('voidzero-dev/setup-vp@'),
      ),
    )
    expect(setups).toHaveLength(5)
    for (const setup of setups) {
      expect(setup.with).toMatchObject({
        'version-file': 'package.json',
        'node-version-file': '.node-version',
        cache: true,
      })
      expect(parse(String(setup.with?.['run-install']))).toEqual({
        args: ['--frozen-lockfile'],
      })
    }
    expect(JSON.stringify(jobs)).not.toContain('npm install --global npm@')
  })

  it('keeps task caches separate from installation and publication checks', () => {
    const steps = workflow.jobs.tests.steps
    const index = (name: string) =>
      steps.findIndex((step: { name?: string }) => step.name === name)
    const restore = steps[index('Restore Vite Task cache')]
    const save = steps[index('Save Vite Task cache')]
    expect(index('Restore Vite Task cache')).toBeGreaterThan(
      index('Save node_modules'),
    )
    expect(index('Restore Vite Task cache')).toBeLessThan(
      index('Run all checks and rebuild artifacts'),
    )
    expect(index('Save Vite Task cache')).toBeGreaterThan(
      index('Check for clean working directory'),
    )
    expect(restore.with.path).toBe('node_modules/.vite/task-cache')
    expect(restore.with.key).toBe(
      `vite-task-\${{ runner.os }}-\${{ runner.arch }}-\${{ github.run_id }}-\${{ github.run_attempt }}`,
    )
    expect(restore.with['restore-keys']).toBe(
      `vite-task-\${{ runner.os }}-\${{ runner.arch }}-`,
    )
    expect(save.if).toBe('success()')
    expect(save.with.path).toBe(restore.with.path)
    expect(save.with.key).toBe(
      `\${{ steps.vite-task-cache.outputs.cache-primary-key }}`,
    )
    expect(JSON.stringify(workflow.jobs['forge-conformance'])).not.toContain(
      'task-cache',
    )
    expect(JSON.stringify(workflow.jobs['package-readiness'])).not.toContain(
      'task-cache',
    )
  })

  it('reruns release and publication validation without task-cache reuse', () => {
    const release = parse(readFileSync('.github/workflows/release.yml', 'utf8'))
    const npm = parse(readFileSync('.github/workflows/npm-publish.yml', 'utf8'))
    for (const job of [release.jobs.prepare, npm.jobs.publish]) {
      const commands = job.steps
        .map((step: { run?: string }) => step.run)
        .filter(Boolean)
      expect(commands).toContain('vp run --no-cache ci')
      expect(commands).toContain('vp run --no-cache test:package-readiness')
      expect(JSON.stringify(job)).not.toContain('task-cache')
    }
    expect(JSON.stringify(workflow.jobs['package-readiness'])).toContain(
      'vp run --no-cache test:package-readiness',
    )
  })

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

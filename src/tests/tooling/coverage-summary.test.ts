import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let directory: string
let script: string
let summary: string

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), 'release-drafter-coverage-'))
  mkdirSync(join(directory, 'src/scripts'), { recursive: true })
  mkdirSync(join(directory, 'coverage'))
  script = join(directory, 'src/scripts/coverage-summary.ts')
  summary = join(directory, 'summary.md')
  copyFileSync(
    resolve(import.meta.dirname, '../../scripts/coverage-summary.ts'),
    script,
  )
})

afterAll(() => {
  rmSync(directory, { recursive: true, force: true })
})

const runCoverage = (total: unknown, env: NodeJS.ProcessEnv = {}) => {
  writeFileSync(
    join(directory, 'coverage/coverage-summary.json'),
    JSON.stringify({ total }),
  )
  rmSync(summary, { force: true })
  return spawnSync(process.execPath, [script], {
    cwd: directory,
    encoding: 'utf8',
    env: {
      ...process.env,
      COVERAGE_THRESHOLD: '90',
      BRANCH_COVERAGE_THRESHOLD: '90',
      GITHUB_STEP_SUMMARY: summary,
      ...env,
    },
  })
}

const totals = (statements: number, branches: number) => ({
  statements: { pct: statements, covered: statements, total: 100 },
  branches: { pct: branches, covered: branches, total: 100 },
})

describe('coverage enforcement', () => {
  it.each([
    { statements: 90, branches: 90, status: 0 },
    { statements: 89.99, branches: 95, status: 1 },
    { statements: 95, branches: 89.99, status: 1 },
    { statements: 0, branches: 0, status: 1 },
  ])(
    'requires both metrics at the threshold: $statements statements, $branches branches',
    ({ statements, branches, status }) => {
      const result = runCoverage(totals(statements, branches))
      expect(result.status).toBe(status)
      expect(result.stdout.split('\n')[0]).toBe(statements.toFixed(2))
      expect(result.stderr).not.toContain('Unable to read')
      const document = readFileSync(summary, 'utf8')
      expect(document).toContain(status === 0 ? '🟢' : '🔴')
      expect(document).toContain('90% statements and 90% branches')
      expect(document).toContain(`| Branches | ${branches.toFixed(2)}% |`)
    },
  )

  it('honors independent statement and branch threshold overrides', () => {
    const result = runCoverage(totals(96, 94), {
      COVERAGE_THRESHOLD: '97',
      BRANCH_COVERAGE_THRESHOLD: '95',
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Coverage 96.00% is below required 97%')
    expect(result.stderr).toContain(
      'Branch coverage 94.00% is below required 95%',
    )
  })

  it.each([
    { COVERAGE_THRESHOLD: 'invalid' },
    { BRANCH_COVERAGE_THRESHOLD: 'Infinity' },
    { BRANCH_COVERAGE_THRESHOLD: '-1' },
    { BRANCH_COVERAGE_THRESHOLD: '101' },
  ])('rejects invalid thresholds: %j', (env) => {
    const result = runCoverage(totals(95, 95), env)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Invalid coverage threshold')
  })

  it.each([
    {},
    { statements: { pct: 95 } },
    { statements: { pct: '95' }, branches: { pct: 95 } },
  ])('rejects incomplete or invalid reports: %j', (total) => {
    const result = runCoverage(total)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Unable to read coverage data')
  })
})

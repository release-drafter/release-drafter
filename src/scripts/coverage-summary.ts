import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readCoverageThreshold } from './coverage-threshold.ts'

type CoverageSummary = {
  total?: {
    statements?: { pct?: number; total?: number; covered?: number }
    branches?: { pct?: number; total?: number; covered?: number }
    functions?: { pct?: number; total?: number; covered?: number }
    lines?: { pct?: number; total?: number; covered?: number }
  }
}

const coverageSummaryPath = resolve(
  import.meta.dirname,
  '../..',
  'coverage',
  'coverage-summary.json',
)

const coverageSummaryContent = readFileSync(coverageSummaryPath, {
  encoding: 'utf-8',
})
const coverageSummary = JSON.parse(coverageSummaryContent) as CoverageSummary

const total = coverageSummary.total
if (
  typeof total?.statements?.pct !== 'number' ||
  typeof total?.branches?.pct !== 'number' ||
  !Number.isFinite(total.statements.pct) ||
  !Number.isFinite(total.branches.pct)
) {
  throw new Error('Unable to read coverage data from coverage-summary.json')
}

const pct = total.statements.pct
const branchPct = total.branches.pct
const threshold = readCoverageThreshold('COVERAGE_THRESHOLD') ?? 90
const branchThreshold = readCoverageThreshold('BRANCH_COVERAGE_THRESHOLD') ?? 90
const meetsThreshold = pct >= threshold && branchPct >= branchThreshold

// Print coverage percentage for logs and local use.
console.log(pct.toFixed(2))

// Write GitHub Actions job summary if running in CI
const summaryFile = process.env.GITHUB_STEP_SUMMARY
if (summaryFile) {
  const emoji = meetsThreshold ? '🟢' : '🔴'
  const status = meetsThreshold ? 'meets' : 'is below'

  const summary = [
    `## ${emoji} Code Coverage: ${pct.toFixed(2)}%`,
    '',
    `Coverage ${status} the required thresholds: ${threshold}% statements and ${branchThreshold}% branches.`,
    '',
    '| Metric | Coverage | Covered | Total |',
    '| --- | --- | --- | --- |',
    `| Statements | ${pct.toFixed(2)}% | ${total.statements.covered} | ${total.statements.total} |`,
    `| Branches | ${branchPct.toFixed(2)}% | ${total.branches.covered} | ${total.branches.total} |`,
    `| Functions | ${total.functions?.pct?.toFixed(2)}% | ${total.functions?.covered} | ${total.functions?.total} |`,
    `| Lines | ${total.lines?.pct?.toFixed(2)}% | ${total.lines?.covered} | ${total.lines?.total} |`,
    '',
  ].join('\n')

  appendFileSync(summaryFile, summary)
}

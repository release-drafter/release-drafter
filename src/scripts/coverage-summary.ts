import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

const readThreshold = (name: string) => {
  const value = process.env[name] ?? '90'
  const threshold = Number(value)
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
    throw new Error(`Invalid coverage threshold (${name}): ${value}`)
  }
  return threshold
}
const pct = total.statements.pct
const branchPct = total.branches.pct
const threshold = readThreshold('COVERAGE_THRESHOLD')
const branchThreshold = readThreshold('BRANCH_COVERAGE_THRESHOLD')
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

for (const metric of [
  { name: 'Coverage', pct, threshold },
  { name: 'Branch coverage', pct: branchPct, threshold: branchThreshold },
]) {
  const passed = metric.pct >= metric.threshold
  const message = `${metric.name} ${metric.pct.toFixed(2)}% ${passed ? 'meets' : 'is below'} required ${metric.threshold}%`
  if (passed) console.log(message)
  else {
    console.error(message)
    process.exitCode = 1
  }
}

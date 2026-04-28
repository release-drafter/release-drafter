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
if (!total?.statements?.pct && total?.statements?.pct !== 0) {
  throw new Error('Unable to read coverage data from coverage-summary.json')
}

const pct = total.statements.pct
const threshold = Number(process.env.COVERAGE_THRESHOLD ?? '90')
const meetsThreshold = pct >= threshold

// Print coverage percentage for CI to capture
console.log(pct.toFixed(2))

// Write GitHub Actions job summary if running in CI
const summaryFile = process.env.GITHUB_STEP_SUMMARY
if (summaryFile) {
  const emoji = meetsThreshold ? '🟢' : '🔴'
  const status = meetsThreshold ? 'meets' : 'is below'

  const summary = [
    `## ${emoji} Code Coverage: ${pct.toFixed(2)}%`,
    '',
    `Coverage ${status} the ${threshold.toFixed(0)}% threshold.`,
    '',
    '| Metric | Coverage | Covered | Total |',
    '| --- | --- | --- | --- |',
    `| Statements | ${total.statements.pct?.toFixed(2)}% | ${total.statements.covered} | ${total.statements.total} |`,
    `| Branches | ${total.branches?.pct?.toFixed(2)}% | ${total.branches?.covered} | ${total.branches?.total} |`,
    `| Functions | ${total.functions?.pct?.toFixed(2)}% | ${total.functions?.covered} | ${total.functions?.total} |`,
    `| Lines | ${total.lines?.pct?.toFixed(2)}% | ${total.lines?.covered} | ${total.lines?.total} |`,
    '',
  ].join('\n')

  appendFileSync(summaryFile, summary)
}

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

type CoverageSummary = {
  total?: {
    statements?: {
      pct?: number
    }
  }
}

const coverageSummaryPath = resolve(
  import.meta.dirname,
  '../..',
  'coverage',
  'coverage-summary.json'
)
const outputBadgePath = resolve(
  import.meta.dirname,
  '../..',
  'badges',
  'coverage.svg'
)

const coverageSummaryContent = readFileSync(coverageSummaryPath, {
  encoding: 'utf-8'
})
const coverageSummary = JSON.parse(coverageSummaryContent) as CoverageSummary

const statementsCoveragePct = coverageSummary.total?.statements?.pct

if (
  typeof statementsCoveragePct !== 'number' ||
  Number.isNaN(statementsCoveragePct)
) {
  throw new Error(
    'Unable to read statements coverage percentage from coverage-summary.json'
  )
}

const label = 'Coverage'
const message = `${statementsCoveragePct.toFixed(2)}%`

const color =
  statementsCoveragePct >= 90
    ? '#4c1'
    : statementsCoveragePct >= 80
      ? '#97CA00'
      : statementsCoveragePct >= 70
        ? '#dfb317'
        : '#e05d44'

const labelWidth = Math.max(48, Math.ceil(label.length * 6.5 + 14))
const messageWidth = Math.max(42, Math.ceil(message.length * 6.5 + 14))
const totalWidth = labelWidth + messageWidth

const labelTextX = Math.round(labelWidth / 2)
const messageTextX = labelWidth + Math.round(messageWidth / 2)

const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${message}"><title>${label}: ${message}</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="${labelWidth}" height="20" fill="#555"/><rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/><rect width="${totalWidth}" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11"><text x="${labelTextX}" y="15" fill="#010101" fill-opacity=".3">${label}</text><text x="${labelTextX}" y="14">${label}</text><text x="${messageTextX}" y="15" fill="#010101" fill-opacity=".3">${message}</text><text x="${messageTextX}" y="14">${message}</text></g></svg>`

writeFileSync(outputBadgePath, badgeSvg, {
  encoding: 'utf-8',
  flag: 'w'
})

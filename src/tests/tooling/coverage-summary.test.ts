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
import { expect, it } from 'vitest'

it.each([0, 94.56])(
  'reports %s%% coverage to stdout and the Actions summary',
  (pct) => {
    const directory = mkdtempSync(join(tmpdir(), 'release-drafter-coverage-'))
    try {
      mkdirSync(join(directory, 'src/scripts'), { recursive: true })
      mkdirSync(join(directory, 'coverage'))
      const script = join(directory, 'src/scripts/coverage-summary.ts')
      const summary = join(directory, 'summary.md')
      copyFileSync(resolve('src/scripts/coverage-summary.ts'), script)
      const metrics = ['statements', 'branches', 'functions', 'lines']
      writeFileSync(
        join(directory, 'coverage/coverage-summary.json'),
        JSON.stringify({
          total: Object.fromEntries(
            metrics.map((metric) => [
              metric,
              {
                pct,
                total: 10000,
                covered: pct * 100,
              },
            ]),
          ),
        }),
      )
      writeFileSync(summary, 'Existing job summary\n')

      const result = spawnSync(process.execPath, [script], {
        encoding: 'utf8',
        env: { ...process.env, GITHUB_STEP_SUMMARY: summary },
      })

      expect(result.status, result.stderr).toBe(0)
      expect(result.stdout.trim()).toBe(pct.toFixed(2))
      const report = readFileSync(summary, 'utf8')
      expect(report).toContain(
        `Existing job summary\n## Code Coverage: ${pct.toFixed(2)}%`,
      )
      for (const metric of metrics) {
        const label = metric[0].toUpperCase() + metric.slice(1)
        expect(report).toContain(
          `| ${label} | ${pct.toFixed(2)}% | ${pct * 100} | 10000 |`,
        )
      }
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  },
)

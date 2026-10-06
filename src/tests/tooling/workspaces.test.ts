import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import {
  actionInputNames as autolabelerInputNames,
  actionOutputNames as autolabelerOutputNames,
} from '#gh-actions/autolabeler/action-metadata.ts'
import {
  actionInputNames as checkPrInputNames,
  actionOutputNames as checkPrOutputNames,
} from '#gh-actions/check-pr/action-metadata.ts'
import {
  actionInputNames as drafterInputNames,
  actionOutputNames as drafterOutputNames,
} from '#gh-actions/drafter/action-metadata.ts'
import { actionManifests } from '#src/scripts/action-metadata-config.ts'
import { collectWorkflowFailures } from '#src/scripts/guard-packages.ts'
import { syncWorkspaceVersions } from '#src/scripts/sync-workspace-versions.ts'

describe('workspace foundation', () => {
  it('preserves action compatibility metadata', () => {
    const rootAction = parseYaml(readFileSync('action.yml', 'utf8'))
    const drafterAction = parseYaml(readFileSync('drafter/action.yml', 'utf8'))
    const autolabelerAction = parseYaml(
      readFileSync('autolabeler/action.yml', 'utf8'),
    )
    const checkPrAction = parseYaml(readFileSync('check-pr/action.yml', 'utf8'))
    const normalizeMain = (metadata: Record<string, unknown>) => ({
      ...metadata,
      runs: { ...(metadata.runs as object), main: '<normalized>' },
    })

    expect(normalizeMain(rootAction)).toEqual(normalizeMain(drafterAction))
    expect(rootAction.runs).toMatchObject({
      using: 'node24',
      main: 'dist/actions/drafter/run.js',
    })
    expect(drafterAction.runs).toMatchObject({
      using: 'node24',
      main: '../dist/actions/drafter/run.js',
    })
    expect(autolabelerAction.runs).toMatchObject({
      using: 'node24',
      main: '../dist/actions/autolabeler/run.js',
    })
    expect(checkPrAction.runs).toMatchObject({
      using: 'node24',
      main: '../dist/actions/check-pr/run.js',
    })
    expect(rootAction.inputs.from).toMatchObject({ required: false })
    expect(rootAction.inputs).toEqual(actionManifests.drafter.inputs)
    expect(rootAction.outputs).toEqual(actionManifests.drafter.outputs)
    expect(autolabelerAction.inputs).toEqual(actionManifests.autolabeler.inputs)
    expect(autolabelerAction.outputs).toEqual(
      actionManifests.autolabeler.outputs,
    )
    expect(checkPrAction.inputs).toEqual(actionManifests.checkPr.inputs)
    expect(checkPrAction.outputs).toEqual(actionManifests.checkPr.outputs)
    expect(Object.keys(rootAction.inputs).sort()).toEqual(
      [...drafterInputNames].sort(),
    )
    expect(Object.keys(rootAction.outputs).sort()).toEqual(
      [...drafterOutputNames].sort(),
    )
    expect(Object.keys(autolabelerAction.inputs).sort()).toEqual(
      [...autolabelerInputNames].sort(),
    )
    expect(Object.keys(autolabelerAction.outputs ?? {}).sort()).toEqual(
      [...autolabelerOutputNames].sort(),
    )
    expect(Object.keys(checkPrAction.inputs).sort()).toEqual(
      [...checkPrInputNames].sort(),
    )
    expect(Object.keys(checkPrAction.outputs ?? {}).sort()).toEqual(
      [...checkPrOutputNames].sort(),
    )
  })

  it('keeps TypeScript scripts directly parseable by Node without compilation', () => {
    const scripts = readdirSync('src/scripts')
      .filter((path) => path.endsWith('.ts'))
      .sort()
    expect(scripts.length).toBeGreaterThan(0)

    for (const script of scripts) {
      execFileSync(process.execPath, ['--check', join('src/scripts', script)], {
        encoding: 'utf8',
        stdio: 'pipe',
      })
    }
  })

  it('rejects npm publication from .yaml workflows', () => {
    const fixtureRoot = mkdtempSync(
      join(tmpdir(), 'release-drafter-workflows-'),
    )
    try {
      mkdirSync(join(fixtureRoot, '.github/workflows'), { recursive: true })
      writeFileSync(
        join(fixtureRoot, '.github/workflows/publish.yaml'),
        'name: publish\nsteps:\n  - run: npm --workspace release-drafter publish\n',
      )

      expect(collectWorkflowFailures(fixtureRoot)).toEqual([
        'publish.yaml must not enable npm publication',
      ])
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true })
    }
  })

  it('allows npm publication only from the dedicated workflow', () => {
    const fixtureRoot = mkdtempSync(
      join(tmpdir(), 'release-drafter-workflows-'),
    )
    try {
      mkdirSync(join(fixtureRoot, '.github/workflows'), { recursive: true })
      writeFileSync(
        join(fixtureRoot, '.github/workflows/npm-publish.yml'),
        'name: publish\njobs:\n  publish:\n    steps:\n      - run: npm publish\n',
      )

      expect(collectWorkflowFailures(fixtureRoot)).toEqual([])
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true })
    }
  })

  it('requires every setup-node step to use the repository Node version', () => {
    const fixtureRoot = mkdtempSync(
      join(tmpdir(), 'release-drafter-workflows-'),
    )
    try {
      mkdirSync(join(fixtureRoot, '.github/workflows'), { recursive: true })
      writeFileSync(
        join(fixtureRoot, '.github/workflows/node.yaml'),
        `
          jobs:
            build:
              steps:
                - uses: actions/setup-node@v6
                  with:
                    node-version-file: .node-version
                - uses: actions/setup-node@v6
        `,
      )

      expect(collectWorkflowFailures(fixtureRoot)).toEqual([
        'node.yaml setup-node step build/2 must select Node through .node-version',
      ])
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true })
    }
  })

  it('synchronizes every workspace manifest to the root version', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'release-drafter-versions-'))
    try {
      writeFileSync(
        join(fixtureRoot, 'package.json'),
        JSON.stringify({ name: '@release-drafter/root', version: '8.1.0' }),
      )
      for (const directory of ['core', 'release-drafter']) {
        const workspace = join(fixtureRoot, 'packages', directory)
        mkdirSync(workspace, { recursive: true })
        writeFileSync(
          join(workspace, 'package.json'),
          JSON.stringify({ name: directory, version: '0.0.1' }),
        )
      }

      expect(syncWorkspaceVersions(fixtureRoot)).toBe('8.1.0')
      for (const directory of ['core', 'release-drafter']) {
        expect(
          JSON.parse(
            readFileSync(
              join(fixtureRoot, 'packages', directory, 'package.json'),
              'utf8',
            ),
          ),
        ).toMatchObject({ version: '8.1.0' })
      }
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true })
    }
  })
})

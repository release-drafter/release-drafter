import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const facadeDist = resolve(repositoryRoot, 'packages/release-drafter/dist')

const buildFacade = () =>
  execFileSync(
    process.execPath,
    [
      process.env.npm_execpath ?? 'node_modules/npm/bin/npm-cli.js',
      'run',
      'build',
      '--workspace',
      'release-drafter',
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
      stdio: 'pipe',
    },
  )

describe.sequential('release-drafter workspace build boundary', () => {
  let javascript: string
  let declarations: string

  beforeAll(() => {
    buildFacade()
    javascript = readFileSync(resolve(facadeDist, 'index.js'), 'utf8')
    declarations = readFileSync(resolve(facadeDist, 'index.d.ts'), 'utf8')
  }, 60_000)

  it('bundles private runtime implementation without forbidden imports or loaders', () => {
    const moduleSpecifiers = [
      ...javascript.matchAll(
        /\b(?:from|import)\s*(?:\(\s*)?(['"])([^'"]+)\1/gu,
      ),
    ].map((match) => match[2])

    expect(javascript).toContain('draftRelease')
    expect(
      moduleSpecifiers.filter((specifier) => !specifier?.startsWith('node:')),
    ).toEqual([])
    expect(javascript).not.toMatch(/@release-drafter\/|@actions\//)
    expect(javascript).not.toMatch(/gitbeaker/i)
    expect(javascript).not.toMatch(
      /node_modules\/semver\/|node-semver|SEMVER_SPEC_VERSION/i,
    )
    expect(javascript).not.toMatch(
      /\bcreateRequire\b|\b__commonJS\w*\b|\b__require\b|\brequire\s*\(|\bmodule\.exports\b/,
    )
  })

  it('emits the real NodeNext-compatible public declaration surface', () => {
    expect(declarations).toContain('export declare const draftRelease')
    expect(declarations).toContain('export interface DraftReleaseOptions')
    expect(declarations).toContain('export interface ForgeAdapter')
    expect(declarations).not.toContain('boundary is established')
    expect(declarations).not.toMatch(/@release-drafter\/|@actions\//)
    expect(declarations).not.toMatch(/gitbeaker/i)
  })
})

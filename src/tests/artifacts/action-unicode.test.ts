import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const generatedDirectories = [
  resolve(repositoryRoot, 'dist/actions'),
  resolve(repositoryRoot, 'dist/chunks'),
]
const listFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })

describe('bundled Action Unicode handling', {
  concurrent: false,
}, () => {
  let generatedJavaScriptFiles: string[]

  beforeAll(() => {
    generatedJavaScriptFiles = generatedDirectories
      .flatMap(listFiles)
      .filter((path) => path.endsWith('.js'))
  }, 60_000)

  it('keeps hidden Unicode characters out of every action bundle', () => {
    // Match the hidden characters Renovate checks, including the YAML BOM.
    const hiddenUnicode =
      /[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\u200b\u200c\ufeff\u200e\u200f\u202a-\u202e\u00ad]/u
    const offenders = generatedJavaScriptFiles
      .filter((path) => hiddenUnicode.test(readFileSync(path, 'utf8')))
      .map((path) => relative(repositoryRoot, path))

    expect(offenders).toEqual([])
  })

  it('preserves BOM handling and Unicode values in the bundled YAML parser', () => {
    const configChunk = generatedJavaScriptFiles.find((path) =>
      readFileSync(path, 'utf8').includes('function composeConfigGet('),
    )
    if (!configChunk) throw new Error('Missing bundled config loader')
    const workspace = mkdtempSync(join(tmpdir(), 'action-unicode-'))

    try {
      writeFileSync(
        join(workspace, 'config.yml'),
        '\ufefftemplate: "Résumé 😀"\nheader: "\\uFEFF"\n',
      )
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          `
            import assert from 'node:assert/strict'
            const bundle = await import(process.argv[1])
            const composeConfigGet = Object.values(bundle).find(
              value => typeof value === 'function' && value.name === 'composeConfigGet'
            )
            assert.ok(composeConfigGet)
            const { config } = await composeConfigGet('file:/config.yml', {
              repo: { owner: 'test', repo: 'test' },
            })
            assert.equal(config.template, 'Résumé 😀')
            assert.equal(config.header, String.fromCharCode(0xfeff))
          `,
          pathToFileURL(configChunk).href,
        ],
        {
          cwd: repositoryRoot,
          env: { ...process.env, GITHUB_WORKSPACE: workspace },
          stdio: 'pipe',
        },
      )
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })
})

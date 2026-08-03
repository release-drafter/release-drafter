import { readdirSync, readFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { dirname, relative, resolve, sep } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const facadeDist = resolve(repositoryRoot, 'packages/release-drafter/dist')
const facadeManifest = resolve(
  repositoryRoot,
  'packages/release-drafter/package.json',
)
const approvedRuntimeDependencies = new Set([
  '@octokit/core',
  '@octokit/plugin-paginate-graphql',
  '@octokit/plugin-paginate-rest',
  '@octokit/plugin-rest-endpoint-methods',
  '@octokit/plugin-retry',
  'undici',
])
const nodeBuiltins = new Set([
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
])
const shippedExtension = /\.(?:js|d\.ts)$/u
const forbiddenImplementation = /@release-drafter\/|@actions\//u
const forbiddenLegacyRuntime =
  /\bcreateRequire\b|\b__commonJS\w*\b|\b__require\b|\brequire\s*\(|\bmodule\.exports\b/u
const forbiddenSemver =
  /node_modules\/semver\/|node-semver|SEMVER_SPEC_VERSION/iu
const forbiddenGhAuthTokenSubprocess =
  /["']gh["']\s*,\s*\[\s*["']auth["']\s*,\s*["']token["']/u
const forbiddenAbsolutePath =
  /(?:[A-Za-z]:[\\/](?:[^'"`\s\\/]+[\\/])+|\/(?:home|Users|private|tmp|workspace|builds|runner)[\\/])/u

const normalizePath = (path: string) => path.split(sep).join('/')

const inventoryShippedFiles = (directory: string): Map<string, string> => {
  const files = new Map<string, string>()

  const visit = (currentDirectory: string) => {
    for (const entry of readdirSync(currentDirectory, {
      withFileTypes: true,
    })) {
      const absolutePath = resolve(currentDirectory, entry.name)
      if (entry.isDirectory()) {
        visit(absolutePath)
      } else {
        const shippedPath = normalizePath(relative(directory, absolutePath))
        if (shippedExtension.test(shippedPath)) {
          files.set(shippedPath, readFileSync(absolutePath, 'utf8'))
        }
      }
    }
  }

  visit(directory)
  return files
}

const moduleSpecifiers = (source: string): string[] =>
  [
    ...source.matchAll(
      /\b(?:import|export)\s+(?:[^'";]*?\sfrom\s*)?(['"])([^'"]+)\1|\bimport\s*\(\s*(['"])([^'"]+)\3\s*\)/gu,
    ),
  ]
    .map((match) => match[2] ?? match[4])
    .filter((value) => value !== undefined)

const isRelativeSpecifier = (specifier: string) =>
  specifier.startsWith('./') || specifier.startsWith('../')

const resolveShippedSpecifier = (
  importer: string,
  specifier: string,
  shippedFiles: ReadonlyMap<string, string>,
): string => {
  const resolvedPath = normalizePath(
    relative(facadeDist, resolve(facadeDist, dirname(importer), specifier)),
  )
  const candidates = [
    resolvedPath,
    `${resolvedPath}.js`,
    `${resolvedPath}.d.ts`,
    resolvedPath.replace(/\.js$/u, '.d.ts'),
    `${resolvedPath}/index.js`,
    `${resolvedPath}/index.d.ts`,
  ]
  const shippedPath = candidates.find((candidate) =>
    shippedFiles.has(candidate),
  )

  if (!shippedPath || shippedPath.startsWith('../')) {
    throw new Error(
      `Shipped module ${importer} references missing relative module ${specifier}`,
    )
  }
  return shippedPath
}

const reachableModules = (
  entry: string,
  shippedFiles: ReadonlyMap<string, string>,
): Set<string> => {
  const reachable = new Set<string>()
  const pending = [entry]

  while (pending.length > 0) {
    const modulePath = pending.pop()
    if (!modulePath || reachable.has(modulePath)) continue
    const source = shippedFiles.get(modulePath)
    if (source === undefined) {
      throw new Error(`Missing shipped entry ${modulePath}`)
    }
    reachable.add(modulePath)
    for (const specifier of moduleSpecifiers(source)) {
      if (isRelativeSpecifier(specifier)) {
        pending.push(
          resolveShippedSpecifier(modulePath, specifier, shippedFiles),
        )
      }
    }
  }

  return reachable
}

describe.sequential('release-drafter workspace build boundary', () => {
  let shippedFiles: Map<string, string>
  let javascriptFiles: Map<string, string>
  let declarations: string
  let indexClosure: Set<string>
  let cliClosure: Set<string>

  beforeAll(() => {
    shippedFiles = inventoryShippedFiles(facadeDist)
    javascriptFiles = new Map(
      [...shippedFiles].filter(([file]) => file.endsWith('.js')),
    )
    declarations = shippedFiles.get('index.d.ts') ?? ''
    indexClosure = reachableModules('index.js', shippedFiles)
    cliClosure = reachableModules('cli.js', shippedFiles)
  }, 120_000)

  it('emits native ESM entries and a fully referenced shared chunk graph', () => {
    expect([...shippedFiles.keys()]).toEqual(
      expect.arrayContaining(['index.js', 'cli.js', 'index.d.ts']),
    )
    expect(shippedFiles.get('index.js')).toContain('draftRelease')
    expect(shippedFiles.get('cli.js')).toMatch(/^#!\/usr\/bin\/env node\n/u)

    const entryClosures = new Set([...indexClosure, ...cliClosure])
    const sharedChunks = [...entryClosures].filter((file) =>
      file.startsWith('chunks/'),
    )
    expect(sharedChunks.length).toBeGreaterThan(0)
    expect(new Set(javascriptFiles.keys())).toEqual(entryClosures)
  })

  it('ships only declared public runtime imports and no private or legacy runtime markers', () => {
    const manifest = JSON.parse(readFileSync(facadeManifest, 'utf8')) as {
      dependencies?: Record<string, string>
    }
    expect(new Set(Object.keys(manifest.dependencies ?? {}))).toEqual(
      approvedRuntimeDependencies,
    )

    for (const [file, source] of shippedFiles) {
      expect(source, file).not.toMatch(forbiddenImplementation)
      expect(source, file).not.toMatch(/gitbeaker/iu)
      expect(source, file).not.toMatch(forbiddenSemver)
      expect(source, file).not.toMatch(forbiddenAbsolutePath)
      expect(source, file).not.toMatch(forbiddenLegacyRuntime)

      for (const specifier of moduleSpecifiers(source)) {
        if (isRelativeSpecifier(specifier)) {
          resolveShippedSpecifier(file, specifier, shippedFiles)
          continue
        }
        if (nodeBuiltins.has(specifier)) continue
        expect(approvedRuntimeDependencies, `${file}: ${specifier}`).toContain(
          specifier,
        )
      }
    }
  })

  it('keeps the programmatic entry independent of GitHub adapter dependencies', () => {
    for (const file of indexClosure) {
      const source = shippedFiles.get(file) ?? ''
      const externalImports = moduleSpecifiers(source).filter(
        (specifier) => !isRelativeSpecifier(specifier),
      )
      expect(externalImports, file).toEqual([])
    }

    for (const file of cliClosure) {
      const source = shippedFiles.get(file) ?? ''
      for (const specifier of moduleSpecifiers(source)) {
        if (isRelativeSpecifier(specifier) || nodeBuiltins.has(specifier))
          continue
        expect(approvedRuntimeDependencies, `${file}: ${specifier}`).toContain(
          specifier,
        )
      }
    }
  })

  it('keeps the CLI closure free of the gh token subprocess fallback', () => {
    for (const file of cliClosure) {
      const source = shippedFiles.get(file) ?? ''
      expect(moduleSpecifiers(source), file).not.toEqual(
        expect.arrayContaining(['child_process', 'node:child_process']),
      )
      expect(source, file).not.toMatch(forbiddenGhAuthTokenSubprocess)
    }
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

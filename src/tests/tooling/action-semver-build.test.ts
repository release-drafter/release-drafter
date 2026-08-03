import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const generatedDirectories = [
  resolve(repositoryRoot, 'dist/actions'),
  resolve(repositoryRoot, 'dist/chunks'),
]
const activeSourceDirectory = resolve(repositoryRoot, 'packages/gh-actions/src')
const nodeSemverBundleMarker =
  /node_modules[\\/]semver[\\/]|node-semver|SEMVER_SPEC_VERSION/i
const directNodeSemverSpecifier = /(['"])semver(?:\/[^'"]*)?\1/u
const directNodeSemverPackages = new Set(['semver', '@types/semver'])

const listFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })

const buildActions = () =>
  execFileSync(
    process.execPath,
    [
      process.env.npm_execpath ?? 'node_modules/npm/bin/npm-cli.js',
      'run',
      'build:actions',
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
      stdio: 'pipe',
    },
  )

const packageManifestPaths = () => [
  resolve(repositoryRoot, 'package.json'),
  ...readdirSync(resolve(repositoryRoot, 'packages')).map((workspace) =>
    resolve(repositoryRoot, 'packages', workspace, 'package.json'),
  ),
]

describe.sequential('action build excludes direct node-semver', () => {
  let generatedJavaScriptFiles: string[]

  beforeAll(() => {
    buildActions()
    generatedJavaScriptFiles = generatedDirectories
      .flatMap(listFiles)
      .filter((path) => path.endsWith('.js'))
  }, 60_000)

  it('keeps node-semver source and module markers out of every action bundle', () => {
    const offenders = generatedJavaScriptFiles
      .filter((path) => nodeSemverBundleMarker.test(readFileSync(path, 'utf8')))
      .map((path) => relative(repositoryRoot, path))

    expect(generatedJavaScriptFiles.length).toBeGreaterThan(0)
    expect(offenders).toEqual([])
  })

  it('prevents active action sources from importing node-semver directly', () => {
    const offenders = listFiles(activeSourceDirectory)
      .filter((path) => path.endsWith('.ts'))
      .filter((path) =>
        directNodeSemverSpecifier.test(readFileSync(path, 'utf8')),
      )
      .map((path) => relative(repositoryRoot, path))

    expect(offenders).toEqual([])
  })

  it('prevents package manifests from declaring node-semver directly', () => {
    const dependencySections = [
      'dependencies',
      'devDependencies',
      'optionalDependencies',
      'peerDependencies',
    ] as const
    const offenders = packageManifestPaths().flatMap((path) => {
      const manifest = JSON.parse(readFileSync(path, 'utf8')) as Record<
        string,
        Record<string, string> | undefined
      >
      return dependencySections.flatMap((section) =>
        Object.keys(manifest[section] ?? {})
          .filter((dependency) => directNodeSemverPackages.has(dependency))
          .map(
            (dependency) =>
              `${relative(repositoryRoot, path)}:${section}.${dependency}`,
          ),
      )
    })

    expect(offenders).toEqual([])
  })

  it('emits distinct first-layer Action entries without cross-entry contamination', () => {
    expect(
      listFiles(resolve(repositoryRoot, 'dist/actions'))
        .map((path) => relative(repositoryRoot, path))
        .sort(),
    ).toEqual([
      'dist/actions/autolabeler/run.js',
      'dist/actions/check-pr-title/run.js',
      'dist/actions/drafter/run.js',
    ])

    const drafterPath = resolve(repositoryRoot, 'dist/actions/drafter/run.js')
    const autolabelerPath = resolve(
      repositoryRoot,
      'dist/actions/autolabeler/run.js',
    )
    const drafter = readFileSync(drafterPath, 'utf8')
    const autolabeler = readFileSync(autolabelerPath, 'utf8')
    const checkPrTitle = readFileSync(
      resolve(repositoryRoot, 'dist/actions/check-pr-title/run.js'),
      'utf8',
    )

    expect(drafter).toContain('release-drafter-action-entry:drafter')
    expect(drafter).not.toContain('release-drafter-action-entry:autolabeler')
    expect(drafter).not.toContain('release-drafter-action-entry:check-pr-title')
    expect(autolabeler).toContain('release-drafter-action-entry:autolabeler')
    expect(autolabeler).not.toContain('release-drafter-action-entry:drafter')
    expect(autolabeler).not.toContain(
      'release-drafter-action-entry:check-pr-title',
    )
    expect(checkPrTitle).toContain(
      'release-drafter-action-entry:check-pr-title',
    )
    expect(checkPrTitle).not.toContain('release-drafter-action-entry:drafter')
    expect(checkPrTitle).not.toContain(
      'release-drafter-action-entry:autolabeler',
    )
    expect(drafter).not.toBe(autolabeler)
    expect(checkPrTitle).not.toBe(drafter)
    expect(checkPrTitle).not.toBe(autolabeler)
  })

  it('keeps private facades, sibling entries, and public CLI sources out of bundles', () => {
    const forbidden = [
      /@release-drafter\//u,
      /packages[\\/](?:release-drafter|cli)[\\/]/u,
      /src[\\/]actions[\\/]/u,
      /dist[\\/]actions[\\/](?:drafter|autolabeler|check-pr-title)[\\/]run\.js/u,
    ]
    const offenders = generatedJavaScriptFiles.flatMap((path) => {
      const contents = readFileSync(path, 'utf8')
      return forbidden
        .filter((pattern) => pattern.test(contents))
        .map((pattern) => `${relative(repositoryRoot, path)}:${pattern.source}`)
    })
    expect(offenders).toEqual([])
  })

  it('retains compiled GHES endpoint and proxy-aware transport evidence', () => {
    const contents = generatedJavaScriptFiles
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n')
    expect(contents).toContain('GITHUB_SERVER_URL')
    expect(contents).toContain('GITHUB_API_URL')
    expect(contents).toContain('GITHUB_GRAPHQL_URL')
    expect(contents).toContain('EnvHttpProxyAgent')
    expect(contents).toContain('HTTP_PROXY')
    expect(contents).toContain('http_proxy')
    expect(contents).toContain('HTTPS_PROXY')
    expect(contents).toContain('https_proxy')
    expect(contents).toContain('NO_PROXY')
    expect(contents).toContain('no_proxy')
  })
})

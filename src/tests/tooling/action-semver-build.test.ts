import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const generatedDirectories = [
  resolve(repositoryRoot, 'dist/actions'),
  resolve(repositoryRoot, 'dist/chunks'),
]
const activeSourceDirectory = resolve(repositoryRoot, 'src/actions')
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
})

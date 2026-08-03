import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { builtinModules } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

type PackedFile = { mode?: number; path: string }
type PackResult = { filename: string; files: PackedFile[] }
type PackOutput = PackResult[] | Record<string, PackResult>
type CommandResult = {
  error?: Error
  signal: NodeJS.Signals | null
  status: number | null
  stderr: string
  stdout: string
}

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const packageDirectory = join(repositoryRoot, 'packages/release-drafter')
const typescriptCli = join(repositoryRoot, 'node_modules/typescript/lib/tsc.js')
const expectedPackageFiles = [
  'LICENSE',
  'README.md',
  'dist/chunks/src-[content-hash].js',
  'dist/cli.js',
  'dist/index.d.ts',
  'dist/index.js',
  'package.json',
]
const approvedRuntimeDependencies = {
  '@octokit/core': '^7.0.6',
  '@octokit/plugin-paginate-graphql': '^6.0.0',
  '@octokit/plugin-paginate-rest': '^14.0.0',
  '@octokit/plugin-rest-endpoint-methods': '^17.0.0',
  '@octokit/plugin-retry': '^8.1.0',
  undici: '^7.29.0',
}
const nodeBuiltins = new Set(
  builtinModules.map((specifier) => specifier.replace(/^node:/, '')),
)

const normalizePackageFile = (path: string): string =>
  /^dist\/chunks\/src-[A-Za-z0-9_-]+\.js$/.test(path)
    ? 'dist/chunks/src-[content-hash].js'
    : path

const importedSpecifiers = (source: string): string[] => {
  const specifiers: string[] = []
  const patterns = [
    /(?:^|\n)\s*(?:import|export)\b[^;]*?\bfrom\s*['"]([^'"]+)['"]/g,
    /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) specifiers.push(match[1])
    }
  }
  return specifiers
}

const parsePackResult = (output: string): PackResult => {
  const parsed = JSON.parse(output) as PackOutput
  const result = Array.isArray(parsed) ? parsed[0] : Object.values(parsed)[0]
  if (!result?.filename || !Array.isArray(result.files)) {
    throw new Error(`npm pack did not describe an artifact:\n${output}`)
  }
  return result
}

const listFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })

const isolatedEnvironment = (): NodeJS.ProcessEnv => {
  const environment = { ...process.env }
  for (const name of [
    'ACTIONS_RUNTIME_TOKEN',
    'FORGEJO_TOKEN',
    'GH_ENTERPRISE_TOKEN',
    'GH_TOKEN',
    'GITHUB_TOKEN',
    'GITLAB_TOKEN',
    'NODE_AUTH_TOKEN',
    'NPM_TOKEN',
    'RELEASE_DRAFTER_TOKEN',
  ]) {
    delete environment[name]
  }
  return {
    ...environment,
    CI: 'true',
    FORCE_COLOR: '0',
    HTTP_PROXY: 'http://127.0.0.1:9',
    HTTPS_PROXY: 'http://127.0.0.1:9',
    NO_COLOR: '1',
    NO_PROXY: '',
    http_proxy: 'http://127.0.0.1:9',
    https_proxy: 'http://127.0.0.1:9',
    no_proxy: '',
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    npm_config_update_notifier: 'false',
  }
}

const packageManagerEnvironment = (): NodeJS.ProcessEnv => {
  const environment = isolatedEnvironment()
  for (const name of [
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'NO_PROXY',
    'http_proxy',
    'https_proxy',
    'no_proxy',
  ]) {
    if (process.env[name] === undefined) delete environment[name]
    else environment[name] = process.env[name]
  }
  return environment
}

const runNode = (
  args: string[],
  cwd = repositoryRoot,
  environment: NodeJS.ProcessEnv = isolatedEnvironment(),
): CommandResult => {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    env: environment,
    stdio: 'pipe',
  })
  return {
    error: result.error,
    signal: result.signal,
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout,
  }
}

const runExecutable = (
  executable: string,
  args: string[],
  cwd: string,
): CommandResult => {
  const result = spawnSync(executable, args, {
    cwd,
    encoding: 'utf8',
    env: isolatedEnvironment(),
    stdio: 'pipe',
  })
  return {
    error: result.error,
    signal: result.signal,
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout,
  }
}

const formatResult = (result: CommandResult): string =>
  JSON.stringify(
    {
      error: result.error?.message,
      signal: result.signal,
      status: result.status,
      stderr: result.stderr,
      stdout: result.stdout,
    },
    null,
    2,
  )

const expectExit = (result: CommandResult, status: number): void => {
  expect(result.error, formatResult(result)).toBeUndefined()
  expect(result.signal, formatResult(result)).toBeNull()
  expect(result.status, formatResult(result)).toBe(status)
}

const runNpm = (args: string[], cwd = repositoryRoot): CommandResult =>
  runNode(
    [process.env.npm_execpath ?? 'node_modules/npm/bin/npm-cli.js', ...args],
    cwd,
    packageManagerEnvironment(),
  )

const expectSuccessfulNpm = (args: string[], cwd = repositoryRoot): string => {
  const result = runNpm(args, cwd)
  expectExit(result, 0)
  return result.stdout
}

const containsJsonOutput = (output: string): boolean =>
  output.split(/\r?\n/).some((line) => {
    const trimmed = line.trim()
    return (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    )
  })

describe.sequential('release-drafter packed CLI and package consumer', () => {
  let temporaryDirectory: string
  let consumerDirectory: string
  let installedPackageDirectory: string
  let installedCli: string
  let manifest: {
    bin?: Record<string, string> | string
    dependencies?: Record<string, string>
    exports?: { '.'?: { import?: string; types?: string } | string }
    license?: string
    name?: string
    type?: string
    version?: string
  }
  let packResult: PackResult

  beforeAll(async () => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'release-drafter-cli-'))
    const packDirectory = join(temporaryDirectory, 'pack')
    consumerDirectory = join(temporaryDirectory, 'consumer')
    mkdirSync(packDirectory)
    mkdirSync(consumerDirectory)

    packResult = parsePackResult(
      expectSuccessfulNpm(
        [
          'pack',
          '--ignore-scripts',
          '--json',
          '--pack-destination',
          packDirectory,
        ],
        packageDirectory,
      ),
    )

    writeFileSync(
      join(consumerDirectory, 'package.json'),
      JSON.stringify({
        name: 'isolated-release-drafter-consumer',
        private: true,
        type: 'module',
      }),
    )
    expectSuccessfulNpm(
      [
        'install',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--package-lock=false',
        join(packDirectory, packResult.filename),
      ],
      consumerDirectory,
    )

    installedPackageDirectory = join(
      consumerDirectory,
      'node_modules/release-drafter',
    )
    installedCli =
      process.platform === 'win32'
        ? join(consumerDirectory, 'node_modules/.bin/release-drafter.cmd')
        : join(consumerDirectory, 'node_modules/.bin/release-drafter')
    manifest = JSON.parse(
      readFileSync(join(installedPackageDirectory, 'package.json'), 'utf8'),
    ) as typeof manifest
  }, 120_000)

  afterAll(() => {
    rmSync(temporaryDirectory, { force: true, recursive: true })
  })

  it('ships exactly the public package inventory with the ISC license', () => {
    expect(
      packResult.files.map(({ path }) => normalizePackageFile(path)).sort(),
    ).toEqual(expectedPackageFiles)
    expect(
      readFileSync(join(installedPackageDirectory, 'LICENSE'), 'utf8'),
    ).toBe(readFileSync(join(repositoryRoot, 'LICENSE'), 'utf8'))
    const installedPackageFiles = listFiles(installedPackageDirectory)
      .map((path) => path.slice(installedPackageDirectory.length + 1))
      .filter((path) => !path.startsWith('node_modules/'))
      .map(normalizePackageFile)
      .sort()
    expect(installedPackageFiles).toEqual(expectedPackageFiles)
  })

  it('publishes the ESM API, executable CLI, and approved public dependencies', () => {
    expect(manifest).toMatchObject({
      bin: { 'release-drafter': './dist/cli.js' },
      exports: {
        '.': {
          import: './dist/index.js',
          types: './dist/index.d.ts',
        },
      },
      license: 'ISC',
      name: 'release-drafter',
      type: 'module',
    })
    expect(manifest.dependencies).toEqual(approvedRuntimeDependencies)
  })

  it('preserves the CLI shebang and executable mode where the platform exposes it', () => {
    const packedCli = packResult.files.find(
      ({ path }) => path === 'dist/cli.js',
    )
    const installedCliPath = join(installedPackageDirectory, 'dist/cli.js')
    expect(
      readFileSync(installedCliPath, 'utf8').startsWith(
        '#!/usr/bin/env node\n',
      ),
    ).toBe(true)

    if (process.platform !== 'win32') {
      expect(packedCli?.mode).toBeDefined()
      expect((packedCli?.mode ?? 0) & 0o111).not.toBe(0)
      expect(statSync(installedCliPath).mode & 0o111).not.toBe(0)
      expect(statSync(installedCli).mode & 0o111).not.toBe(0)
    }
  })

  it('type-checks and imports the programmatic API without CLI side effects', () => {
    writeFileSync(
      join(consumerDirectory, 'consumer.mts'),
      `
      import { draftRelease } from 'release-drafter'
      import type {
        DraftReleaseOptions,
        DraftReleaseResult,
        ForgeAdapter,
        Logger,
      } from 'release-drafter'

      const invoke: (
        options: DraftReleaseOptions,
      ) => Promise<DraftReleaseResult> = draftRelease
      declare const adapter: ForgeAdapter
      declare const logger: Logger
      const injectable = { adapter, logger } satisfies Partial<DraftReleaseOptions>
      void invoke
      void injectable
    `,
    )
    writeFileSync(
      join(consumerDirectory, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: 'ES2024',
          types: [],
        },
        include: ['consumer.mts'],
      }),
    )
    const typecheck = runNode(
      [typescriptCli, '-p', 'tsconfig.json'],
      consumerDirectory,
    )
    expectExit(typecheck, 0)

    writeFileSync(
      join(consumerDirectory, 'import-api.mjs'),
      `
      process.argv = [process.execPath, import.meta.filename, '--help']
      process.exit = (code) => {
        throw new Error('root import attempted to exit with code ' + code)
      }
      const stdoutWrite = process.stdout.write
      const stderrWrite = process.stderr.write
      process.stdout.write = () => {
        throw new Error('root import wrote to stdout')
      }
      process.stderr.write = () => {
        throw new Error('root import wrote to stderr')
      }
      const facade = await import('release-drafter')
      process.stdout.write = stdoutWrite
      process.stderr.write = stderrWrite
      if (typeof facade.draftRelease !== 'function') {
        throw new Error('draftRelease is not a function')
      }
      stdoutWrite.call(process.stdout, 'imported\\n')
    `,
    )
    const imported = runNode(['import-api.mjs'], consumerDirectory)
    expectExit(imported, 0)
    expect(imported.stderr, formatResult(imported)).toBe('')
    expect(imported.stdout, formatResult(imported)).toBe('imported\n')
  })

  it('runs help and version through the installed binary without auth, network, or JSON noise', () => {
    const help = runExecutable(installedCli, ['--help'], consumerDirectory)
    expectExit(help, 0)
    expect(help.stderr, formatResult(help)).toBe('')
    expect(help.stdout).toMatch(/usage:/i)
    expect(help.stdout).toMatch(/release-drafter/i)
    expect(containsJsonOutput(help.stdout)).toBe(false)

    const version = runExecutable(
      installedCli,
      ['--version'],
      consumerDirectory,
    )
    expectExit(version, 0)
    expect(version.stderr, formatResult(version)).toBe('')
    expect(version.stdout, formatResult(version)).toBe(
      `release-drafter ${manifest.version}\n`,
    )
    expect(containsJsonOutput(version.stdout)).toBe(false)
  })

  it('rejects an invalid forge with usage status before auth or network access', () => {
    const invalid = runExecutable(
      installedCli,
      ['owner/repository', '--forge', 'definitely-not-a-forge'],
      consumerDirectory,
    )
    expectExit(invalid, 2)
    expect(invalid.stdout, formatResult(invalid)).toBe('')
    const diagnostic = invalid.stderr.split('\n', 1)[0]
    expect(diagnostic).toMatch(/forge/i)
    expect(diagnostic).toMatch(/invalid|supported|unknown|usage/i)
    expect(diagnostic).not.toMatch(/token|authenticat|network|fetch|ECONN/i)
  })

  it('contains no private imports, bundled dependency markers, loaders, paths, or undeclared external imports', () => {
    const shippedSources = listFiles(installedPackageDirectory).filter(
      (path) => {
        const relativePath = path.slice(installedPackageDirectory.length + 1)
        return (
          !relativePath.startsWith('node_modules/') &&
          /(?:\.js|\.d\.[cm]?ts)$/.test(path)
        )
      },
    )
    const failures = shippedSources.flatMap((path) => {
      const source = readFileSync(path, 'utf8')
      const relativePath = path.slice(installedPackageDirectory.length + 1)
      const problems: string[] = []
      const checks: [RegExp, string][] = [
        [/gitbeaker/i, 'GitBeaker marker'],
        [
          /node-semver|SEMVER_SPEC_VERSION|MAX_SAFE_COMPONENT_LENGTH|MAX_SAFE_BUILD_LENGTH/,
          'node-semver marker',
        ],
        [
          /\bcreateRequire\b|\b__require\b|\brequire\s*\(|\bmodule\.exports\b|\b__commonJS/,
          'CommonJS loader',
        ],
        [
          new RegExp(
            `${repositoryRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${pathToFileURL(repositoryRoot).href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
          ),
          'absolute repository path',
        ],
      ]
      for (const [pattern, description] of checks) {
        if (pattern.test(source)) problems.push(description)
      }

      for (const specifier of importedSpecifiers(source)) {
        if (
          specifier.startsWith('@release-drafter/') ||
          specifier.startsWith('@actions/')
        ) {
          problems.push(`private runtime import: ${specifier}`)
          continue
        }
        const bareBuiltin = specifier.replace(/^node:/, '')
        const packageName = specifier.startsWith('@')
          ? specifier.split('/').slice(0, 2).join('/')
          : specifier.split('/')[0]
        if (
          !specifier.startsWith('.') &&
          !specifier.startsWith('node:') &&
          !nodeBuiltins.has(bareBuiltin) &&
          !nodeBuiltins.has(bareBuiltin.split('/')[0] ?? '') &&
          !Object.hasOwn(approvedRuntimeDependencies, packageName)
        ) {
          problems.push(`undeclared external import: ${specifier}`)
        }
      }
      return problems.map((problem) => `${relativePath}: ${problem}`)
    })

    expect(failures).toEqual([])
  })
})

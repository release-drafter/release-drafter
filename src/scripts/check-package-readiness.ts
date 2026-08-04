import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type PackedFile = { mode?: unknown; path?: unknown }
type PackageResult = {
  filename?: unknown
  files?: PackedFile[]
  name?: unknown
  version?: unknown
}
type ParsedPackageResult = PackageResult & { files: PackedFile[] }

export const expectedPackageFiles = [
  'LICENSE',
  'README.md',
  'dist/chunks/src-[content-hash].js',
  'dist/cli.js',
  'dist/index.d.ts',
  'dist/index.js',
  'package.json',
]

export const packArguments = (destination: string): string[] => [
  'pack',
  '--ignore-scripts',
  '--json',
  '--pack-destination',
  destination,
]

export const publishArguments = (tarball: string): string[] => [
  'publish',
  tarball,
  '--dry-run',
  '--ignore-scripts',
  '--offline',
  '--json',
  '--provenance=false',
]

const credentialEnvironmentName =
  /(?:token|password|username|_auth|userconfig|globalconfig)/iu
const npmConfigurationEnvironmentName = /^npm_config_/iu
const proxyEnvironmentName = /^(?:all|http|https|no)_proxy$/iu
const publishAutoCorrectionWarning =
  /npm (?:warn|WARN) publish[^\n]*auto(?:\s|-)?corrected/iu

export const hasPublishAutoCorrectionWarning = (stderr: string): boolean =>
  publishAutoCorrectionWarning.test(stderr)

const normalizePackageFile = (path: string): string =>
  /^dist\/chunks\/src-[A-Za-z0-9_-]+\.js$/u.test(path)
    ? 'dist/chunks/src-[content-hash].js'
    : path

export const sanitizedNpmEnvironment = (
  environment: NodeJS.ProcessEnv,
  userConfigPath: string,
  globalConfigPath: string,
): NodeJS.ProcessEnv => {
  const sanitized: NodeJS.ProcessEnv = {}
  for (const [name, value] of Object.entries(environment)) {
    if (
      !credentialEnvironmentName.test(name) &&
      !npmConfigurationEnvironmentName.test(name) &&
      !proxyEnvironmentName.test(name)
    ) {
      sanitized[name] = value
    }
  }

  return {
    ...sanitized,
    CI: 'true',
    FORCE_COLOR: '0',
    NO_COLOR: '1',
    NPM_CONFIG_AUDIT: 'false',
    NPM_CONFIG_CACHE: join(dirname(userConfigPath), 'cache'),
    NPM_CONFIG_FUND: 'false',
    NPM_CONFIG_GLOBALCONFIG: globalConfigPath,
    NPM_CONFIG_OFFLINE: 'true',
    NPM_CONFIG_PROVENANCE: 'false',
    NPM_CONFIG_UPDATE_NOTIFIER: 'false',
    NPM_CONFIG_USERCONFIG: userConfigPath,
    npm_config_globalconfig: globalConfigPath,
    npm_config_userconfig: userConfigPath,
  }
}

const parsePackageResult = (
  stdout: string,
  command: 'pack' | 'publish',
): ParsedPackageResult => {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout) as unknown
  } catch (error) {
    throw new Error(`npm ${command} returned invalid JSON:\n${stdout}`, {
      cause: error,
    })
  }

  let result: unknown
  if (Array.isArray(parsed)) {
    result = parsed[0]
  } else if (parsed && typeof parsed === 'object') {
    const directResult = parsed as PackageResult
    result = Array.isArray(directResult.files)
      ? directResult
      : Object.values(parsed)[0]
  }
  if (
    !result ||
    typeof result !== 'object' ||
    !Array.isArray((result as PackageResult).files)
  ) {
    throw new Error(`npm ${command} did not describe package files`)
  }
  return result as ParsedPackageResult
}

const packageFiles = (result: ParsedPackageResult): string[] =>
  result.files
    .map(({ path }) => {
      if (typeof path !== 'string') {
        throw new Error('npm returned a package file without a path')
      }
      return normalizePackageFile(path)
    })
    .sort()

const assertExactInventory = (files: string[], source: string): void => {
  if (JSON.stringify(files) !== JSON.stringify(expectedPackageFiles)) {
    throw new Error(
      `${source} inventory drifted:\n${JSON.stringify(files, null, 2)}`,
    )
  }
}

const run = (
  executable: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
) => {
  const result = spawnSync(executable, args, {
    ...options,
    encoding: 'utf8',
    stdio: 'pipe',
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(
      `${basename(executable)} ${args[0]} failed with status ${result.status}:\n${result.stderr}`,
    )
  }
  return result
}

const runNpm = (
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
  npmExecPath?: string,
) =>
  npmExecPath?.endsWith('.js')
    ? run(process.execPath, [npmExecPath, ...args], options)
    : run(npmExecPath ?? 'npm', args, options)

export const checkPackageReadiness = (
  rootDir = process.cwd(),
  environment: NodeJS.ProcessEnv = process.env,
  npmExecPath = environment.npm_execpath,
): void => {
  const rootManifest = JSON.parse(
    readFileSync(join(rootDir, 'package.json'), 'utf8'),
  ) as { version?: unknown }
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), 'release-drafter-npm-readiness-'),
  )

  try {
    const packDirectory = join(temporaryDirectory, 'pack')
    const extractionDirectory = join(temporaryDirectory, 'extract')
    const userConfigPath = join(temporaryDirectory, 'user.npmrc')
    const globalConfigPath = join(temporaryDirectory, 'global.npmrc')
    mkdirSync(packDirectory)
    mkdirSync(extractionDirectory)
    writeFileSync(userConfigPath, '')
    writeFileSync(globalConfigPath, '')
    const env = sanitizedNpmEnvironment(
      environment,
      userConfigPath,
      globalConfigPath,
    )
    const facadeDirectory = join(rootDir, 'packages/release-drafter')

    const pack = parsePackageResult(
      runNpm(
        packArguments(packDirectory),
        { cwd: facadeDirectory, env },
        npmExecPath,
      ).stdout,
      'pack',
    )
    if (
      pack.name !== 'release-drafter' ||
      pack.version !== rootManifest.version
    ) {
      throw new Error(
        `npm pack targeted ${String(pack.name)}@${String(pack.version)} instead of release-drafter@${String(rootManifest.version)}`,
      )
    }
    if (typeof pack.filename !== 'string') {
      throw new Error('npm pack did not report a tarball filename')
    }
    const packedFiles = packageFiles(pack)
    assertExactInventory(packedFiles, 'npm pack')

    const cli = pack.files.find(({ path }) => path === 'dist/cli.js')
    if (cli?.mode !== 0o755) {
      throw new Error(
        `packed CLI mode must be 0755, received ${String(cli?.mode)}`,
      )
    }

    const tarball = join(packDirectory, basename(pack.filename))
    run('tar', ['-xzf', tarball, '-C', extractionDirectory], {
      cwd: rootDir,
      env,
    })
    const packedRoot = join(extractionDirectory, 'package')
    const packedManifest = JSON.parse(
      readFileSync(join(packedRoot, 'package.json'), 'utf8'),
    ) as {
      bin?: Record<string, string>
      license?: unknown
      name?: unknown
      version?: unknown
    }
    if (
      packedManifest.name !== 'release-drafter' ||
      packedManifest.version !== rootManifest.version ||
      packedManifest.license !== 'ISC' ||
      packedManifest.bin?.['release-drafter'] !== 'dist/cli.js'
    ) {
      throw new Error('packed package metadata is not the intended ISC facade')
    }
    if (
      !readFileSync(join(packedRoot, 'dist/cli.js'), 'utf8').startsWith(
        '#!/usr/bin/env node\n',
      )
    ) {
      throw new Error('packed CLI must begin with the Node env shebang')
    }

    const publishProcess = runNpm(
      publishArguments(tarball),
      { cwd: rootDir, env },
      npmExecPath,
    )
    if (hasPublishAutoCorrectionWarning(publishProcess.stderr)) {
      throw new Error(
        `npm publish auto-corrected package metadata:\n${publishProcess.stderr}`,
      )
    }
    const publish = parsePackageResult(publishProcess.stdout, 'publish')
    if (
      publish.name !== 'release-drafter' ||
      publish.version !== rootManifest.version
    ) {
      throw new Error(
        `npm publish --dry-run targeted ${String(publish.name)}@${String(publish.version)} instead of release-drafter@${String(rootManifest.version)}`,
      )
    }
    const publishedFiles = packageFiles(publish)
    assertExactInventory(publishedFiles, 'npm publish --dry-run')
    if (JSON.stringify(publishedFiles) !== JSON.stringify(packedFiles)) {
      throw new Error('npm publish --dry-run inventory differs from npm pack')
    }
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true })
  }
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  checkPackageReadiness()
  console.log('npm package publication readiness passed')
}

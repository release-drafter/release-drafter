import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

type PackedFile = { path: string }
type PackResult = { filename: string; files: PackedFile[] }
type PackOutput = PackResult[] | Record<string, PackResult>

const parsePackResult = (output: string): PackResult => {
  const parsed = JSON.parse(output) as PackOutput
  const packResult = Array.isArray(parsed)
    ? parsed[0]
    : Object.values(parsed)[0]
  if (!packResult?.filename || !Array.isArray(packResult.files)) {
    throw new Error('npm pack did not describe an artifact')
  }
  return packResult
}

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const facadeDirectory = join(repositoryRoot, 'packages/release-drafter')
const typescriptCli = join(repositoryRoot, 'node_modules/typescript/lib/tsc.js')

const listFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })

const execNode = (args: string[], cwd = repositoryRoot) => {
  try {
    return execFileSync(process.execPath, args, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
      stdio: 'pipe',
    })
  } catch (error) {
    const failure = error as Error & { stderr?: string; stdout?: string }
    throw new Error(
      [failure.message, failure.stdout, failure.stderr]
        .filter(Boolean)
        .join('\n'),
      { cause: error },
    )
  }
}

const execNpm = (args: string[], cwd = repositoryRoot) =>
  execNode(
    [process.env.npm_execpath ?? 'node_modules/npm/bin/npm-cli.js', ...args],
    cwd,
  )

describe.sequential('release-drafter packed programmatic facade', () => {
  let temporaryDirectory: string
  let consumerDirectory: string
  let installedPackageDirectory: string
  let packedFiles: string[]

  beforeAll(() => {
    temporaryDirectory = mkdtempSync(
      join(tmpdir(), 'release-drafter-consumer-'),
    )
    const packDirectory = join(temporaryDirectory, 'pack')
    consumerDirectory = join(temporaryDirectory, 'consumer')
    mkdirSync(packDirectory)
    mkdirSync(consumerDirectory)

    const packOutput = execNpm(
      [
        'pack',
        '--ignore-scripts',
        '--json',
        '--pack-destination',
        packDirectory,
      ],
      facadeDirectory,
    )
    const packResult = parsePackResult(packOutput)
    packedFiles = packResult.files.map(({ path }) => path).sort()

    writeFileSync(
      join(consumerDirectory, 'package.json'),
      JSON.stringify({
        name: 'isolated-consumer',
        private: true,
        type: 'module',
      }),
    )
    execNpm(
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
  }, 60_000)

  afterAll(() => {
    rmSync(temporaryDirectory, { force: true, recursive: true })
  })

  it('ships the ESM entrypoint and NodeNext declarations in the tarball', () => {
    expect(packedFiles).toContain('dist/index.js')
    expect(packedFiles).toContain('dist/index.d.ts')
    expect(packedFiles.every((path) => !path.startsWith('src/'))).toBe(true)

    const manifest = JSON.parse(
      readFileSync(join(installedPackageDirectory, 'package.json'), 'utf8'),
    ) as {
      exports?: { '.'?: { import?: string; types?: string } }
      type?: string
    }
    expect(manifest.type).toBe('module')
    expect(manifest.exports?.['.']).toMatchObject({
      types: './dist/index.d.ts',
      import: './dist/index.js',
    })
  })

  it('type-checks the public API and forge-neutral types in an isolated NodeNext project', () => {
    writeFileSync(
      join(consumerDirectory, 'consumer.mts'),
      `
        import { createForgeAdapter, draftRelease } from 'release-drafter'
        import type {
          DraftReleaseOptions,
          DraftReleaseResult,
          ForgeAdapter,
          ForgejoForgeAdapterOptions,
          GiteaForgeAdapterOptions,
          GitHubForgeAdapterOptions,
          GitLabForgeAdapterOptions,
          Logger,
          CreateForgeAdapterOptions,
        } from 'release-drafter'

        const invoke: (
          options: DraftReleaseOptions,
        ) => Promise<DraftReleaseResult> = draftRelease
        declare const adapter: ForgeAdapter
        declare const logger: Logger
        const injectable = { adapter, logger } satisfies Partial<DraftReleaseOptions>
        void invoke
        void injectable
        const factoryOptions = {
          forge: 'gitlab',
          token: 'token',
          limits: { retries: 0, maxAssociatedMergeRequests: 5 },
        } satisfies CreateForgeAdapterOptions
        const githubOptions = {
          forge: 'github',
          token: 'token',
          requestRetries: 1,
        } satisfies GitHubForgeAdapterOptions
        const giteaOptions = {
          forge: 'gitea',
          token: 'token',
          limits: { maxPages: 2 },
        } satisfies GiteaForgeAdapterOptions
        const forgejoOptions = {
          forge: 'forgejo',
          token: 'token',
          limits: { maxRequestsPerOperation: 3 },
        } satisfies ForgejoForgeAdapterOptions
        const gitlabOptions = {
          forge: 'gitlab',
          token: 'token',
          limits: { retries: 0 },
        } satisfies GitLabForgeAdapterOptions
        // @ts-expect-error GitHub must reject ignored adapter limits.
        createForgeAdapter({ forge: 'github', token: 'token', limits: {} })
        void createForgeAdapter
        void factoryOptions
        void [githubOptions, giteaOptions, forgejoOptions, gitlabOptions]
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

    expect(() =>
      execNode([typescriptCli, '-p', 'tsconfig.json'], consumerDirectory),
    ).not.toThrow()
  })

  it('imports the API without executing CLI behavior', () => {
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

    expect(execNode(['import-api.mjs'], consumerDirectory)).toBe('imported\n')
  })

  it('constructs all bundled forge adapters without private workspace packages', () => {
    writeFileSync(
      join(consumerDirectory, 'construct-adapters.mjs'),
      `
        import { createForgeAdapter } from 'release-drafter'

        const results = ['github', 'gitea', 'forgejo', 'gitlab'].map((forge) => {
          const adapter = createForgeAdapter({
            forge,
            token: 'not-a-real-token',
            fetch: async () => new Response('{}', { status: 200 }),
          })
          return [forge, adapter.capabilities.draftReleases]
        })
        process.stdout.write(JSON.stringify(results) + '\\n')
      `,
    )

    expect(execNode(['construct-adapters.mjs'], consumerDirectory)).toBe(
      '[["github",true],["gitea",true],["forgejo",true],["gitlab",false]]\n',
    )
  })

  it('runs a dry-run release through the bundled core implementation', () => {
    writeFileSync(
      join(consumerDirectory, 'draft-release.mjs'),
      `
        import { draftRelease } from 'release-drafter'

        const result = await draftRelease({
          adapter: {
            capabilities: { draftReleases: true },
            async listReleases() {
              return [{ id: 1, tagName: 'v1.0.0', draft: false }]
            },
            async findChanges() {
              return {
                commits: [],
                pullRequests: [],
                newContributorLogins: new Set(),
              }
            },
            async resolveCommitish({ commitish }) {
              return commitish
            },
            async createRelease() {
              throw new Error('dry run attempted to create a release')
            },
            async updateRelease() {
              throw new Error('dry run attempted to update a release')
            },
          },
          config: {
            'change-template': '* $TITLE',
            'change-author-template': '$AUTHOR_MENTION',
            'change-authors-separator': ', ',
            'no-changes-template': '* No changes',
            'version-template': '$MAJOR.$MINOR.$PATCH$PRERELEASE',
            'name-template': 'v$RESOLVED_VERSION',
            'tag-template': 'v$RESOLVED_VERSION',
            'exclude-contributors': [],
            'new-contributor-template': '* $AUTHOR_MENTION',
            'no-new-contributor-template': '* No new contributors',
            'no-contributors-template': 'No contributors',
            'sort-by': 'merged_at',
            'sort-direction': 'descending',
            'filter-by-commitish': false,
            'pull-request-limit': 5,
            'history-limit': 15,
            replacers: [],
            categories: [],
            'category-template': '## $TITLE',
            template: '$CHANGES',
            latest: true,
            prerelease: false,
            commitish: 'main',
          },
          input: { publish: false, dryRun: true, version: '1.0.1' },
          repository: {
            owner: 'release-drafter',
            name: 'release-drafter',
            serverUrl: 'https://example.test',
          },
        })

        if (
          result.plan.action !== 'dry-run' ||
          result.releasePayload.tag !== 'v1.0.1'
        ) {
          throw new Error(JSON.stringify(result))
        }
        process.stdout.write(result.releasePayload.tag + '\\n')
      `,
    )

    expect(execNode(['draft-release.mjs'], consumerDirectory)).toBe('v1.0.1\n')
  })

  it('contains no unresolved private imports, action runtime imports, foreign forge types, or CommonJS loader shims', () => {
    const publicFiles = listFiles(installedPackageDirectory).filter(
      (path) =>
        /\.(?:[cm]?js|d\.[cm]?ts)$/.test(path) &&
        !path.includes(
          `${join('node_modules', 'release-drafter', 'node_modules')}`,
        ),
    )
    expect(publicFiles.length).toBeGreaterThan(0)

    const failures = publicFiles.flatMap((path) => {
      const source = readFileSync(path, 'utf8')
      const relativePath = path.slice(installedPackageDirectory.length + 1)
      const fileFailures: string[] = []
      const unresolvedImport =
        /(?:from\s+|import\s*(?:\(\s*)?|require\s*\(\s*)['"](?:@release-drafter\/|@actions\/)/
      if (unresolvedImport.test(source))
        fileFailures.push(`${relativePath}: unresolved private import`)
      if (/\.d\.[cm]?ts$/.test(path) && /gitbeaker/i.test(source))
        fileFailures.push(`${relativePath}: leaked GitBeaker type`)
      if (
        /\.[cm]?js$/.test(path) &&
        /\bcreateRequire\b|\b__require\b|\brequire\s*\(/.test(source)
      ) {
        fileFailures.push(`${relativePath}: CommonJS loader shim`)
      }
      return fileFailures
    })

    expect(failures).toEqual([])
  })
})

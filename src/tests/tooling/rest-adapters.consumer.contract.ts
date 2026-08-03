import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const typescriptCli = join(repositoryRoot, 'node_modules/typescript/lib/tsc.js')

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

const execNpm = (args: string[]) =>
  execNode([
    process.env.npm_execpath ?? 'node_modules/npm/bin/npm-cli.js',
    ...args,
  ])

describe.sequential('built REST adapter declarations', () => {
  let consumerDirectory: string

  beforeAll(() => {
    execNpm(['run', 'build', '--workspace', '@release-drafter/core'])
    execNpm(['run', 'build', '--workspace', '@release-drafter/rest-adapter'])
    execNpm(['run', 'build', '--workspace', '@release-drafter/gitea-adapter'])
    execNpm(['run', 'build', '--workspace', '@release-drafter/forgejo-adapter'])
    execNpm(['run', 'build', '--workspace', '@release-drafter/gitlab-adapter'])
    consumerDirectory = mkdtempSync(
      join(tmpdir(), 'release-drafter-adapter-consumer-'),
    )
    const scopeDirectory = join(
      consumerDirectory,
      'node_modules',
      '@release-drafter',
    )
    mkdirSync(scopeDirectory, { recursive: true })
    for (const packageDirectory of [
      'core',
      'rest-adapter',
      'gitea-adapter',
      'forgejo-adapter',
      'gitlab-adapter',
    ]) {
      symlinkSync(
        join(repositoryRoot, 'packages', packageDirectory),
        join(scopeDirectory, packageDirectory),
        process.platform === 'win32' ? 'junction' : 'dir',
      )
    }
  }, 60_000)

  afterAll(() => {
    rmSync(consumerDirectory, { force: true, recursive: true })
  })

  it('type-checks classes, profiles, factories, and public types from package entrypoints', () => {
    writeFileSync(
      join(consumerDirectory, 'consumer.ts'),
      `
        import type { ForgeAdapter } from '@release-drafter/core'
        import {
          createGitHubCompatibleRestAdapter,
          createRestEndpoints,
          defaultRestAdapterLimits,
          type RestAdapterLimits,
          type RestAdapterOptions,
          type RestForgeProfile,
        } from '@release-drafter/rest-adapter'
        import {
          GiteaAdapter,
          giteaProfile,
        } from '@release-drafter/gitea-adapter'
        import {
          ForgejoAdapter,
          forgejoProfile,
        } from '@release-drafter/forgejo-adapter'
        import {
          GitLabAdapter,
          defaultGitLabAdapterLimits,
          type GitLabAdapterLimits,
          type GitLabAdapterOptions,
        } from '@release-drafter/gitlab-adapter'

        const options: RestAdapterOptions = { token: 'token' }
        const limits: RestAdapterLimits = defaultRestAdapterLimits
        const profiles: RestForgeProfile[] = [giteaProfile, forgejoProfile]
        const gitea = new GiteaAdapter(options)
        const forgejo = new ForgejoAdapter(options)
        const gitlabOptions: GitLabAdapterOptions = { token: 'token' }
        const gitlabLimits: GitLabAdapterLimits = defaultGitLabAdapterLimits
        const adapters: ForgeAdapter[] = [
          gitea,
          forgejo,
          createGitHubCompatibleRestAdapter(
            { ...giteaProfile, endpoints: createRestEndpoints() },
            options,
          ),
          new GitLabAdapter(gitlabOptions),
        ]
        void limits
        void profiles
        void adapters
        void gitlabLimits

        // @ts-expect-error Adapter credentials remain encapsulated.
        void gitea.options
        // @ts-expect-error Adapter credentials remain encapsulated.
        void forgejo.options
        // @ts-expect-error Wire response types are intentionally not public.
        type WireCommit = import('@release-drafter/rest-adapter').RestCommit
        // @ts-expect-error GitBeaker clients are intentionally not public.
        type GitBeakerClient = import('@release-drafter/gitlab-adapter').Gitlab
        // @ts-expect-error Internal GitLab wire types are intentionally not public.
        type GitLabWireCommit = import('@release-drafter/gitlab-adapter').GitLabCommit
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
        include: ['consumer.ts'],
      }),
    )

    expect(() =>
      execNode([typescriptCli, '-p', 'tsconfig.json'], consumerDirectory),
    ).not.toThrow()
  })

  it('does not emit declarations into workspace source directories', () => {
    const output = execNode(
      [
        '-e',
        `
          const { readdirSync, statSync } = require('node:fs')
          const { join } = require('node:path')
          const visit = (directory) => readdirSync(directory).flatMap((entry) => {
            const path = join(directory, entry)
            return statSync(path).isDirectory() ? visit(path) : [path]
          })
          process.stdout.write(
            visit('packages')
              .filter((path) => path.includes('/src/') && path.endsWith('.d.ts'))
              .join('\\n'),
          )
        `,
      ],
      repositoryRoot,
    )
    expect(output).toBe('')
  })

  it('keeps GitBeaker clients and GitLab wire types out of built declarations', () => {
    const declaration = readFileSync(
      join(repositoryRoot, 'packages/gitlab-adapter/dist/index.d.ts'),
      'utf8',
    )
    expect(declaration).not.toMatch(/@gitbeaker/i)
    expect(declaration).not.toMatch(/\bGitlab\b/)
    expect(declaration).not.toMatch(/\bGitLabClient\b/)
    expect(declaration).not.toMatch(
      /\bGitLab(?:Api|Commit|Comparison|Diff|MergeRequest|Release|Tag|User)\b/,
    )
  })
})

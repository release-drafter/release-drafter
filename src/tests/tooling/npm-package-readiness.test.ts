import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import {
  expectedPackageFiles,
  hasPublishAutoCorrectionWarning,
  packArguments,
  publishArguments,
  sanitizedNpmEnvironment,
} from '#src/scripts/check-package-readiness.ts'

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const readJson = (path: string) =>
  JSON.parse(readFileSync(join(repositoryRoot, path), 'utf8')) as Record<
    string,
    unknown
  >

describe('npm package readiness', () => {
  it('packs once and dry-runs the exact tarball with fail-closed arguments', () => {
    expect(packArguments('/isolated/pack')).toEqual([
      'pack',
      '--ignore-scripts',
      '--json',
      '--pack-destination',
      '/isolated/pack',
    ])
    expect(
      publishArguments('/isolated/pack/release-drafter-7.7.0.tgz'),
    ).toEqual([
      'publish',
      '/isolated/pack/release-drafter-7.7.0.tgz',
      '--dry-run',
      '--ignore-scripts',
      '--offline',
      '--json',
      '--provenance=false',
    ])
    expect(publishArguments('/artifact.tgz')).not.toContain('--workspace')
    expect(expectedPackageFiles).toEqual([
      'LICENSE',
      'README.md',
      'dist/chunks/src-[content-hash].js',
      'dist/cli.js',
      'dist/index.d.ts',
      'dist/index.js',
      'package.json',
    ])
  })

  it('rejects hyphenated and spaced npm metadata correction warnings', () => {
    expect(
      hasPublishAutoCorrectionWarning(
        'npm warn publish npm auto-corrected some errors in your package.json',
      ),
    ).toBe(true)
    expect(
      hasPublishAutoCorrectionWarning(
        'npm WARN publish npm auto corrected some errors in your package.json',
      ),
    ).toBe(true)
    expect(
      hasPublishAutoCorrectionWarning('npm notice publish dry-run complete'),
    ).toBe(false)
  })

  it('removes auth-related environment and isolates npm configuration', () => {
    const environment = sanitizedNpmEnvironment(
      {
        HOME: '/home/test',
        HTTPS_PROXY: 'https://publisher:secret@proxy.example',
        NPM_CONFIG_CERT: '/home/test/client-cert.pem',
        NODE_AUTH_TOKEN: 'node-secret',
        NPM_CONFIG_GLOBALCONFIG: '/etc/npmrc',
        NPM_CONFIG_KEY: '/home/test/client-key.pem',
        NPM_CONFIG_OTP: '123456',
        NPM_CONFIG_REGISTRY: 'https://publisher:secret@registry.example',
        NPM_CONFIG_USERCONFIG: '/home/test/.npmrc',
        NPM_TOKEN: 'npm-secret',
        'npm_config_//registry.npmjs.org/:_authToken': 'registry-secret',
        npm_config_proxy: 'https://publisher:secret@proxy.example',
        npm_config_username: 'publisher',
      },
      '/isolated/user.npmrc',
      '/isolated/global.npmrc',
    )

    expect(environment).toMatchObject({
      HOME: '/home/test',
      NPM_CONFIG_CACHE: '/isolated/cache',
      NPM_CONFIG_GLOBALCONFIG: '/isolated/global.npmrc',
      NPM_CONFIG_OFFLINE: 'true',
      NPM_CONFIG_PROVENANCE: 'false',
      NPM_CONFIG_USERCONFIG: '/isolated/user.npmrc',
      npm_config_globalconfig: '/isolated/global.npmrc',
      npm_config_userconfig: '/isolated/user.npmrc',
    })
    for (const name of [
      'NODE_AUTH_TOKEN',
      'NPM_TOKEN',
      'HTTPS_PROXY',
      'NPM_CONFIG_CERT',
      'NPM_CONFIG_KEY',
      'NPM_CONFIG_OTP',
      'NPM_CONFIG_REGISTRY',
      'npm_config_//registry.npmjs.org/:_authToken',
      'npm_config_proxy',
      'npm_config_username',
    ]) {
      expect(environment[name]).toBeUndefined()
    }
  })

  it('guards the private root and scoped workspaces while allowing only the facade', () => {
    const root = readJson('package.json') as {
      private?: boolean
      scripts?: Record<string, string>
    }
    expect(root.private).toBe(true)
    expect(root.scripts?.['test:package-readiness']).toBe(
      'npm run build --workspace release-drafter && vitest run src/tests/tooling/release-drafter-package.test.ts --coverage.enabled=false && npm run check:package-readiness',
    )

    for (const directory of readdirSync(join(repositoryRoot, 'packages'))) {
      const manifest = readJson(`packages/${directory}/package.json`) as {
        license?: string
        name?: string
        private?: boolean
      }
      if (directory === 'release-drafter') {
        expect(manifest).toMatchObject({
          license: 'ISC',
          name: 'release-drafter',
        })
        expect(manifest.private).not.toBe(true)
      } else {
        expect(manifest.name).toBe(`@release-drafter/${directory}`)
        expect(manifest.private).toBe(true)
      }
    }
  })

  it('uses a SHA-pinned, least-privilege PR, main-push, and manual workflow', () => {
    const contents = readFileSync(
      join(repositoryRoot, '.github/workflows/npm-package-readiness.yml'),
      'utf8',
    )
    const workflow = parseYaml(contents) as {
      on?: Record<string, unknown>
      permissions?: Record<string, string>
      jobs?: Record<
        string,
        {
          'runs-on'?: string
          'timeout-minutes'?: number
          steps?: Array<{
            run?: string
            uses?: string
            with?: Record<string, unknown>
          }>
        }
      >
    }
    const job = workflow.jobs?.['package-readiness']
    const steps = job?.steps ?? []

    expect(Object.keys(workflow.on ?? {}).sort()).toEqual([
      'pull_request',
      'push',
      'workflow_dispatch',
    ])
    expect(workflow.on?.push).toEqual({ branches: ['main'] })
    expect(workflow.permissions).toEqual({ contents: 'read' })
    expect(job?.['runs-on']).toBe('ubuntu-latest')
    expect(job?.['timeout-minutes']).toBe(15)
    expect(contents).not.toMatch(
      /id-token|registry-url|NODE_AUTH_TOKEN|NPM_TOKEN|secrets\.|cache:/u,
    )
    expect(steps.flatMap(({ uses }) => (uses ? [uses] : []))).toEqual([
      'actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0',
      'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020',
    ])
    expect(steps[1]?.with).toEqual({ 'node-version-file': '.node-version' })

    const installNpm = steps.findIndex(
      ({ run }) => run === 'npm install --global npm@12.0.1 --ignore-scripts',
    )
    const npmCi = steps.findIndex(({ run }) => run === 'npm ci')
    expect(installNpm).toBeGreaterThan(-1)
    expect(npmCi).toBeGreaterThan(installNpm)
    expect(
      steps.find(({ run }) => run === 'npm run test:package-readiness'),
    ).toBeDefined()
    expect(steps.find(({ run }) => run === 'npm run check:clean')).toBeDefined()
  })

  it('rejects npm publish metadata auto-correction and always cleans temporary data', () => {
    const source = readFileSync(
      join(repositoryRoot, 'src/scripts/check-package-readiness.ts'),
      'utf8',
    )
    expect(source).toContain('hasPublishAutoCorrectionWarning')
    expect(source).toContain(
      'rmSync(temporaryDirectory, { force: true, recursive: true })',
    )
    expect(source).toMatch(/try \{[\s\S]*\} finally \{/u)
    expect(source.match(/packArguments\(packDirectory\)/gu)).toHaveLength(1)
  })
})

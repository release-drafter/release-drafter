import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse } from 'yaml'

type PackageJson = {
  name?: string
  version?: string
  private?: boolean
  workspaces?: string[]
  engines?: { node?: string }
  publishConfig?: unknown
}

type Workflow = {
  jobs?: Record<
    string,
    {
      steps?: Array<{
        uses?: unknown
        with?: Record<string, unknown>
      }>
    }
  >
}

const npmPublicationPattern =
  /\bnpm(?:[ \t]+(?!publish\b|token\b)[^\s#]+)*[ \t]+(?:publish|token)\b|registry-url|NODE_AUTH_TOKEN/

export function collectWorkflowFailures(rootDir = '.') {
  const failures: string[] = []
  for (const workflow of readdirSync(join(rootDir, '.github/workflows')).filter(
    (path) => path.endsWith('.yml') || path.endsWith('.yaml'),
  )) {
    const contents = readFileSync(
      join(rootDir, '.github/workflows', workflow),
      'utf8',
    )
    if (npmPublicationPattern.test(contents))
      failures.push(`${workflow} must not enable npm publication`)
    const parsedWorkflow = parse(contents) as Workflow
    for (const [jobName, job] of Object.entries(parsedWorkflow.jobs ?? {})) {
      for (const [stepIndex, step] of (job.steps ?? []).entries()) {
        if (
          typeof step.uses === 'string' &&
          step.uses.startsWith('actions/setup-node@') &&
          step.with?.['node-version-file'] !== '.node-version'
        ) {
          failures.push(
            `${workflow} setup-node step ${jobName}/${stepIndex + 1} must select Node through .node-version`,
          )
        }
      }
    }
  }
  return failures
}

function main() {
  const root = JSON.parse(readFileSync('package.json', 'utf8')) as PackageJson
  const failures: string[] = []
  if (!root.version) failures.push('root package must declare a version')
  if (!readFileSync('.node-version', 'utf8').trim().startsWith('24.'))
    failures.push('.node-version must declare Node 24')
  if (root.private !== true) failures.push('root package must be private')
  if (root.name === 'release-drafter')
    failures.push('root package must not use the public facade name')
  if (root.engines?.node !== '>=24.0.0')
    failures.push('root package must declare Node >=24.0.0')
  if (JSON.stringify(root.workspaces) !== JSON.stringify(['packages/*']))
    failures.push('root workspaces must be ["packages/*"]')
  const packageDirs = readdirSync('packages', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  const expected = [
    'autolabeler',
    'cli',
    'core',
    'forgejo-adapter',
    'gh-actions',
    'gitea-adapter',
    'github-adapter',
    'gitlab-adapter',
    'release-drafter',
    'rest-adapter',
  ]
  if (JSON.stringify(packageDirs) !== JSON.stringify(expected))
    failures.push(`workspace dirs drifted: ${packageDirs.join(', ')}`)
  for (const dir of packageDirs) {
    const manifest = JSON.parse(
      readFileSync(join('packages', dir, 'package.json'), 'utf8'),
    ) as PackageJson
    if (manifest.version !== root.version)
      failures.push(
        `${manifest.name} version ${manifest.version ?? '<missing>'} must match root version ${root.version}`,
      )
    if (manifest.engines?.node !== '>=24.0.0')
      failures.push(`${dir} must declare Node >=24.0.0`)
    if (dir === 'release-drafter') {
      if (manifest.name !== 'release-drafter')
        failures.push('facade package must be unscoped release-drafter')
      if (manifest.private === true)
        failures.push('facade package must be structurally publishable')
    } else {
      if (manifest.name !== `@release-drafter/${dir}`)
        failures.push(`${dir} must be scoped @release-drafter/${dir}`)
      if (manifest.private !== true)
        failures.push(`${manifest.name} must be private`)
    }
    if (dir === 'release-drafter') {
      const publishConfig = manifest.publishConfig as
        | { access?: string }
        | undefined
      if (publishConfig?.access !== 'public')
        failures.push(
          'facade package must declare public publishConfig for structural eligibility',
        )
    } else if (manifest.publishConfig) {
      failures.push(
        `${manifest.name} must not enable publication config in #1692`,
      )
    }
  }
  for (const actionPath of [
    'action.yml',
    'drafter/action.yml',
    'autolabeler/action.yml',
  ]) {
    if (!readFileSync(actionPath, 'utf8').includes('using: node24'))
      failures.push(`${actionPath} must use the Node 24 Action runtime`)
  }
  failures.push(...collectWorkflowFailures())
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('Package publication guard passed')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()

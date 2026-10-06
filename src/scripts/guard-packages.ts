import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse } from 'yaml'

type PackageJson = {
  name?: string
  version?: string
  private?: boolean
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
    if (workflow !== 'npm-publish.yml' && npmPublicationPattern.test(contents))
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

export function collectPackageFailures(rootDir = '.') {
  const root = JSON.parse(
    readFileSync(join(rootDir, 'package.json'), 'utf8'),
  ) as PackageJson
  const failures: string[] = []
  if (!root.version) failures.push('root package must declare a version')
  if (root.private !== true) failures.push('root package must be private')
  const packageDirs = readdirSync(join(rootDir, 'packages'), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  for (const dir of packageDirs) {
    const manifest = JSON.parse(
      readFileSync(join(rootDir, 'packages', dir, 'package.json'), 'utf8'),
    ) as PackageJson
    if (manifest.version !== root.version)
      failures.push(
        `${manifest.name} version ${manifest.version ?? '<missing>'} must match root version ${root.version}`,
      )
    if (dir === 'release-drafter') {
      if (manifest.name !== 'release-drafter')
        failures.push('facade package must be unscoped release-drafter')
      if (manifest.private === true)
        failures.push('facade package must be structurally publishable')
    } else {
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
        `${manifest.name} must not declare publishConfig; only release-drafter is publishable`,
      )
    }
  }
  failures.push(...collectWorkflowFailures(rootDir))
  return failures
}

function main() {
  const failures = collectPackageFailures()
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('Package publication guard passed')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()

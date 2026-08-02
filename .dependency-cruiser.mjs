import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const workspaceRoot = join(process.cwd(), 'packages')
const dependencySections = [
  'dependencies',
  'peerDependencies',
  'devDependencies',
]
const runtimeDependencySections = ['dependencies', 'peerDependencies']

const escapeRegExp = (value) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')

const workspaces = readdirSync(workspaceRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const manifest = JSON.parse(
      readFileSync(join(workspaceRoot, entry.name, 'package.json'), 'utf8'),
    )
    return { directory: entry.name, manifest }
  })

const workspaceDirectoryByName = new Map(
  workspaces.map(({ directory, manifest }) => [manifest.name, directory]),
)

const declaredWorkspaceDirectories = (manifest, sections) =>
  new Set(
    sections.flatMap((section) =>
      Object.keys(manifest[section] ?? {})
        .map((name) => workspaceDirectoryByName.get(name))
        .filter(Boolean),
    ),
  )

const workspacePath = (directories) =>
  `^packages/(?:${directories.map(escapeRegExp).join('|')})/(?:src|dist)/`

const workspaceBoundaryRules = workspaces.flatMap(({ directory, manifest }) => {
  const otherDirectories = workspaces
    .map((workspace) => workspace.directory)
    .filter((candidate) => candidate !== directory)
  const sourceDependencies = declaredWorkspaceDirectories(
    manifest,
    dependencySections,
  )
  const runtimeDependencies = declaredWorkspaceDirectories(
    manifest,
    runtimeDependencySections,
  )
  const undeclaredSourceDirectories = otherDirectories.filter(
    (candidate) => !sourceDependencies.has(candidate),
  )
  const undeclaredRuntimeDirectories = otherDirectories.filter(
    (candidate) => !runtimeDependencies.has(candidate),
  )
  const rules = []

  if (undeclaredSourceDirectories.length > 0) {
    rules.push({
      name: `workspace-source-dependencies-${directory}`,
      severity: 'error',
      comment:
        'Workspace source may only import internal packages declared in dependencies, peerDependencies, or devDependencies.',
      from: { path: `^packages/${escapeRegExp(directory)}/src/` },
      to: { path: workspacePath(undeclaredSourceDirectories) },
    })
  }

  const outputDirectories =
    manifest.name === 'release-drafter'
      ? otherDirectories
      : undeclaredRuntimeDirectories
  if (outputDirectories.length > 0) {
    rules.push({
      name:
        manifest.name === 'release-drafter'
          ? 'public-facade-must-bundle-private-workspaces'
          : `workspace-output-dependencies-${directory}`,
      severity: 'error',
      comment:
        manifest.name === 'release-drafter'
          ? 'The public facade must not expose unresolved private workspace imports in emitted JavaScript or declarations.'
          : 'Emitted JavaScript and declarations may only import internal runtime dependencies.',
      from: { path: `^packages/${escapeRegExp(directory)}/dist/` },
      to: { path: workspacePath(outputDirectories) },
    })
  }

  return rules
})

/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'no-workspace-cycles',
      severity: 'error',
      comment: 'Workspace dependency cycles are not allowed.',
      from: { path: '^packages/' },
      to: { circular: true },
    },
    {
      name: 'no-unresolved-workspace-imports',
      severity: 'error',
      comment: 'Workspace imports must resolve before they can be published.',
      from: { path: '^packages/' },
      to: { couldNotResolve: true },
    },
    ...workspaceBoundaryRules,
  ],
  options: {
    doNotFollow: { path: '(^|/)node_modules/' },
    enhancedResolveOptions: {
      conditionNames: ['types', 'import', 'node', 'default'],
      exportsFields: ['exports'],
      mainFields: ['types', 'module', 'main'],
    },
    includeOnly: '^packages/',
    parser: 'swc',
  },
}

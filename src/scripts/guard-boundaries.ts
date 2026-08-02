import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

type PackageJson = {
  name?: string
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const privateImportPattern =
  /(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\(|\bimport\s*)['"](@release-drafter\/[a-z0-9-]+(?:\/[^'"]*)?)['"]/g
const sourceExtensions = ['.ts', '.tsx', '.js', '.mjs', '.cjs']
const outputExtensions = ['.js', '.mjs', '.cjs', '.d.ts', '.d.mts', '.d.cts']

const walkFiles = (directory: string, extensions: string[]): string[] => {
  try {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return walkFiles(path, extensions)
      return extensions.some((extension) => entry.name.endsWith(extension))
        ? [path]
        : []
    })
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return []
    }
    throw error
  }
}

const privateImports = (path: string) =>
  new Set(
    [...readFileSync(path, 'utf8').matchAll(privateImportPattern)].map(
      ([, specifier]) => specifier.split('/').slice(0, 2).join('/'),
    ),
  )

/** Returns workspace boundary violations beneath a repository root. */
export const collectBoundaryFailures = (root = process.cwd()): string[] => {
  const failures: string[] = []
  const packagesRoot = join(root, 'packages')

  for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const workspaceRoot = join(packagesRoot, entry.name)
    const manifestPath = join(workspaceRoot, 'package.json')
    if (!statSync(manifestPath).isFile()) continue
    const manifest = JSON.parse(
      readFileSync(manifestPath, 'utf8'),
    ) as PackageJson
    const declaredRuntimeDependencies = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ])

    for (const path of walkFiles(
      join(workspaceRoot, 'src'),
      sourceExtensions,
    )) {
      for (const importedPackage of privateImports(path)) {
        if (!declaredRuntimeDependencies.has(importedPackage)) {
          failures.push(
            `${manifest.name} imports undeclared private runtime dependency ${importedPackage} in ${relative(root, path)}`,
          )
        }
      }
    }

    for (const path of walkFiles(
      join(workspaceRoot, 'dist'),
      outputExtensions,
    )) {
      for (const importedPackage of privateImports(path)) {
        if (manifest.name === 'release-drafter') {
          failures.push(
            `public facade output contains unresolved private import ${importedPackage} in ${relative(root, path)}`,
          )
        } else if (!declaredRuntimeDependencies.has(importedPackage)) {
          failures.push(
            `${manifest.name} output imports undeclared private runtime dependency ${importedPackage} in ${relative(root, path)}`,
          )
        }
      }
    }
  }

  return failures
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const failures = collectBoundaryFailures()
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('Workspace boundary guard passed')
}

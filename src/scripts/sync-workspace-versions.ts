import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

type PackageJson = { version?: string }

/** Synchronizes every workspace manifest to the root package version. */
export const syncWorkspaceVersions = (root = process.cwd()): string => {
  const rootManifest = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  ) as PackageJson
  if (!rootManifest.version) throw new Error('Root package version is missing')

  for (const entry of readdirSync(join(root, 'packages'), {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue
    const manifestPath = join(root, 'packages', entry.name, 'package.json')
    const manifest = JSON.parse(
      readFileSync(manifestPath, 'utf8'),
    ) as PackageJson
    manifest.version = rootManifest.version
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  }

  return rootManifest.version
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  console.log(`Synchronized workspace versions to ${syncWorkspaceVersions()}`)
}

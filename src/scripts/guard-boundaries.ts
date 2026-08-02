import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { SyntaxKind } from 'typescript/unstable/ast'
import { createScanner } from 'typescript/unstable/ast/scanner'

type PackageJson = {
  name?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

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

type PrivateImport = {
  packageName: string
  typeOnly: boolean
}

type ScannedToken = {
  kind: SyntaxKind
  value: string
}

const privatePackageName = (specifier: string) =>
  specifier.match(/^(@release-drafter\/[a-z0-9-]+)(?:\/|$)/)?.[1]

const scanTokens = (contents: string): ScannedToken[] => {
  const scanner = createScanner(true, undefined, contents)
  const tokens: ScannedToken[] = []
  for (
    let kind = scanner.scan();
    kind !== SyntaxKind.EndOfFile;
    kind = scanner.scan()
  ) {
    tokens.push({ kind, value: scanner.getTokenValue() })
  }
  return tokens
}

const namedBindingsAreTypeOnly = (tokens: ScannedToken[]) => {
  if (
    tokens[0]?.kind !== SyntaxKind.OpenBraceToken ||
    tokens.at(-1)?.kind !== SyntaxKind.CloseBraceToken
  )
    return false

  const bindings: ScannedToken[][] = [[]]
  for (const token of tokens.slice(1, -1)) {
    if (token.kind === SyntaxKind.CommaToken) bindings.push([])
    else bindings.at(-1)?.push(token)
  }
  const nonemptyBindings = bindings.filter((binding) => binding.length > 0)
  return (
    nonemptyBindings.length > 0 &&
    nonemptyBindings.every(
      (binding) => binding[0]?.kind === SyntaxKind.TypeKeyword,
    )
  )
}

const privateImports = (path: string): PrivateImport[] => {
  const imports = new Map<string, boolean>()
  const tokens = scanTokens(readFileSync(path, 'utf8'))

  const addImport = (specifier: string, typeOnly: boolean) => {
    const packageName = privatePackageName(specifier)
    if (!packageName) return
    imports.set(packageName, (imports.get(packageName) ?? true) && typeOnly)
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const next = tokens[index + 1]
    if (
      token.kind === SyntaxKind.RequireKeyword &&
      next?.kind === SyntaxKind.OpenParenToken &&
      tokens[index + 2]?.kind === SyntaxKind.StringLiteral
    ) {
      addImport(tokens[index + 2].value, false)
      continue
    }

    if (token.kind === SyntaxKind.ImportKeyword) {
      if (
        next?.kind === SyntaxKind.OpenParenToken &&
        tokens[index + 2]?.kind === SyntaxKind.StringLiteral
      ) {
        addImport(tokens[index + 2].value, false)
        continue
      }
      if (next?.kind === SyntaxKind.StringLiteral) {
        addImport(next.value, false)
        continue
      }

      const fromIndex = tokens.findIndex(
        (candidate, candidateIndex) =>
          candidateIndex > index && candidate.kind === SyntaxKind.FromKeyword,
      )
      if (
        fromIndex > index &&
        tokens[fromIndex + 1]?.kind === SyntaxKind.StringLiteral
      ) {
        const clause = tokens.slice(index + 1, fromIndex)
        addImport(
          tokens[fromIndex + 1].value,
          clause[0]?.kind === SyntaxKind.TypeKeyword ||
            namedBindingsAreTypeOnly(clause),
        )
      }
      continue
    }

    if (token.kind === SyntaxKind.ExportKeyword) {
      const typeOnly = next?.kind === SyntaxKind.TypeKeyword
      const clauseStart = index + (typeOnly ? 2 : 1)
      let fromIndex = -1
      if (tokens[clauseStart]?.kind === SyntaxKind.AsteriskToken) {
        fromIndex = tokens.findIndex(
          (candidate, candidateIndex) =>
            candidateIndex > clauseStart &&
            candidate.kind === SyntaxKind.FromKeyword,
        )
      } else if (tokens[clauseStart]?.kind === SyntaxKind.OpenBraceToken) {
        const closeBraceIndex = tokens.findIndex(
          (candidate, candidateIndex) =>
            candidateIndex > clauseStart &&
            candidate.kind === SyntaxKind.CloseBraceToken,
        )
        if (tokens[closeBraceIndex + 1]?.kind === SyntaxKind.FromKeyword)
          fromIndex = closeBraceIndex + 1
      }
      if (
        fromIndex > index &&
        tokens[fromIndex + 1]?.kind === SyntaxKind.StringLiteral
      ) {
        const clause = tokens.slice(clauseStart, fromIndex)
        addImport(
          tokens[fromIndex + 1].value,
          typeOnly || namedBindingsAreTypeOnly(clause),
        )
      }
    }
  }

  return [...imports].map(([packageName, typeOnly]) => ({
    packageName,
    typeOnly,
  }))
}

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
    const declaredTypeDependencies = new Set([
      ...declaredRuntimeDependencies,
      ...Object.keys(manifest.devDependencies ?? {}),
    ])

    for (const path of walkFiles(
      join(workspaceRoot, 'src'),
      sourceExtensions,
    )) {
      for (const importedPackage of privateImports(path)) {
        const declaredDependencies = importedPackage.typeOnly
          ? declaredTypeDependencies
          : declaredRuntimeDependencies
        if (!declaredDependencies.has(importedPackage.packageName)) {
          const dependencyKind = importedPackage.typeOnly ? 'type' : 'runtime'
          failures.push(
            `${manifest.name} imports undeclared private ${dependencyKind} dependency ${importedPackage.packageName} in ${relative(root, path)}`,
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
            `public facade output contains unresolved private import ${importedPackage.packageName} in ${relative(root, path)}`,
          )
        } else if (
          !declaredRuntimeDependencies.has(importedPackage.packageName)
        ) {
          failures.push(
            `${manifest.name} output imports undeclared private runtime dependency ${importedPackage.packageName} in ${relative(root, path)}`,
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

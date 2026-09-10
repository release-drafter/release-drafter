import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { type ParseOptions, parseFileSync } from '@swc/core'

type PackageJson = {
  name?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const typescriptExtensions = new Set(['.ts', '.tsx', '.mts', '.cts'])
const sourceExtensions = [
  ...typescriptExtensions,
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
]

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

const privatePackageName = (specifier: string) =>
  specifier.match(/^(@release-drafter\/[a-z0-9-]+)(?:\/|$)/)?.[1]

type AstNode = Record<string, unknown> & { type?: string }

const isAstNode = (value: unknown): value is AstNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const stringLiteralValue = (value: unknown) =>
  isAstNode(value) &&
  value.type === 'StringLiteral' &&
  typeof value.value === 'string'
    ? value.value
    : undefined

const parserOptions = (path: string): ParseOptions => {
  const extension = extname(path)
  if (typescriptExtensions.has(extension)) {
    return {
      syntax: 'typescript',
      tsx: extension === '.tsx',
      decorators: true,
      target: 'esnext',
    }
  }
  return {
    syntax: 'ecmascript',
    jsx: extension === '.jsx',
    decorators: true,
    target: 'esnext',
  }
}

const privateImports = (path: string): PrivateImport[] => {
  const imports = new Map<string, boolean>()

  const addImport = (specifier: string, typeOnly: boolean) => {
    const packageName = privatePackageName(specifier)
    if (!packageName) return
    imports.set(packageName, (imports.get(packageName) ?? true) && typeOnly)
  }

  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const child of value) visit(child)
      return
    }
    if (!isAstNode(value)) return

    if (value.type === 'ImportDeclaration') {
      const specifier = stringLiteralValue(value.source)
      const bindings = Array.isArray(value.specifiers) ? value.specifiers : []
      const bindingsAreTypeOnly =
        bindings.length > 0 &&
        bindings.every(
          (binding) =>
            isAstNode(binding) &&
            binding.type === 'ImportSpecifier' &&
            binding.isTypeOnly === true,
        )
      if (specifier)
        addImport(specifier, value.typeOnly === true || bindingsAreTypeOnly)
    } else if (
      value.type === 'ExportNamedDeclaration' ||
      value.type === 'ExportAllDeclaration'
    ) {
      const specifier = stringLiteralValue(value.source)
      const bindings = Array.isArray(value.specifiers) ? value.specifiers : []
      const bindingsAreTypeOnly =
        bindings.length > 0 &&
        bindings.every(
          (binding) => isAstNode(binding) && binding.isTypeOnly === true,
        )
      if (specifier)
        addImport(specifier, value.typeOnly === true || bindingsAreTypeOnly)
    } else if (value.type === 'TsImportType') {
      const specifier = stringLiteralValue(value.argument)
      if (specifier) addImport(specifier, true)
    } else if (value.type === 'TsImportEqualsDeclaration') {
      const moduleReference = isAstNode(value.moduleRef)
        ? value.moduleRef
        : undefined
      const specifier =
        moduleReference?.type === 'TsExternalModuleReference'
          ? stringLiteralValue(moduleReference.expression)
          : undefined
      if (specifier) addImport(specifier, value.isTypeOnly === true)
    } else if (value.type === 'CallExpression') {
      const callee = isAstNode(value.callee) ? value.callee : undefined
      const firstArgument = Array.isArray(value.arguments)
        ? value.arguments[0]
        : undefined
      const argumentExpression = isAstNode(firstArgument)
        ? firstArgument.expression
        : undefined
      const specifier = stringLiteralValue(argumentExpression)
      if (
        specifier &&
        (callee?.type === 'Import' ||
          (callee?.type === 'Identifier' && callee.value === 'require'))
      )
        addImport(specifier, false)
    }

    for (const [key, child] of Object.entries(value)) {
      if (key !== 'span') visit(child)
    }
  }

  visit(parseFileSync(path, parserOptions(path)))

  return [...imports].map(([packageName, typeOnly]) => ({
    packageName,
    typeOnly,
  }))
}

/**
 * Returns runtime imports that are declared only as development dependencies.
 *
 * dependency-cruiser owns workspace graph extraction and declaration/output
 * coverage. This focused SWC AST check remains because dependency-cruiser's
 * extracted edges do not retain the type-only distinction needed here.
 */
export const collectRuntimeDependencyFailures = (
  root = process.cwd(),
): string[] => {
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
    const bundlesPrivateWorkspaces = manifest.name === 'release-drafter'
    const declaredRuntimeDependencies = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ])
    const declaredDevelopmentDependencies = new Set(
      Object.keys(manifest.devDependencies ?? {}),
    )

    for (const path of walkFiles(
      join(workspaceRoot, 'src'),
      sourceExtensions,
    )) {
      for (const importedPackage of privateImports(path)) {
        if (
          !bundlesPrivateWorkspaces &&
          !importedPackage.typeOnly &&
          !declaredRuntimeDependencies.has(importedPackage.packageName) &&
          declaredDevelopmentDependencies.has(importedPackage.packageName)
        ) {
          failures.push(
            `${manifest.name} imports private runtime dependency ${importedPackage.packageName} from devDependencies in ${relative(root, path)}`,
          )
        }
      }
    }
  }

  return failures
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const failures = collectRuntimeDependencyFailures()
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('Workspace runtime dependency guard passed')
}

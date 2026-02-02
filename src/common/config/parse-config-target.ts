export type ConfigTarget = {
  scheme: 'file' | 'github'
  repo: { owner: string; repo: string }
  ref?: string
  filepath: string
}

/**
 * Parses a config target string into its components
 * @param target - Target string in format `[github:][[owner/]repo]:filepath[@ref]` or `file:filepath`
 * @param currentContext - Current runtime context (repo owner, name, and ref)
 * @returns Parsed config target with resolved components
 */
export function parseConfigTarget(
  target: string,
  context: Pick<ConfigTarget, 'ref' | 'repo'>
): ConfigTarget {
  const _context = structuredClone(context)
  let _target = structuredClone(target).trim()

  const getErr = (m: string) =>
    new Error(
      `invalid format: "${_target}". Expected format [github:][owner/repo:]filepath[@ref] or file:filepath. ${m}`
    )

  if (_target.includes(' ')) {
    throw getErr('Target must not contain spaces.')
  }

  // Parse & pop the scheme, default to "github"
  const scheme = _target.startsWith('file:') ? 'file' : 'github'
  if (_target.startsWith('file:')) _target = _target.slice(5)
  if (_target.startsWith('github:')) _target = _target.slice(7)

  // Check if target is a local file path (no repo specifier)
  const hasRepoSpecifier = _target.includes(':')

  const hasRefSpecifier = _target.includes('@')

  // Ban github specifiers with file scheme
  if (scheme === 'file') {
    if (hasRepoSpecifier)
      throw getErr('Local file targets cannot have ":" github specifiers.')
    if (hasRefSpecifier)
      throw getErr('Local file targets cannot have "@" github specifiers.')
  }

  const parts = _target.split(':').flatMap((part) => part.split('@'))

  let targetRepo: { owner: string; repo: string }
  let targetRef: string | undefined

  if (parts.length > 3) throw getErr('":" or "@" was specified more than once.')

  if (hasRepoSpecifier) {
    if (parts.length < 2) throw getErr('Missing repo specifier.')

    const repoSpecifier = parts[0]

    const repoParts = repoSpecifier.split('/')

    let targetRepoOwner: string
    let targetRepoName: string

    if (!repoParts.length) throw getErr('Missing repo specifier.')
    if (repoParts.length > 2) throw getErr('"/" specified more than once.')
    if (repoParts.length === 2) {
      // ex: cchanche/release-drafter:.github/release-drafter.yml@main
      targetRepoOwner = repoParts[0]
      targetRepoName = repoParts[1]
    } else {
      // ex: release-drafter:.github/release-drafter.yml@main
      targetRepoName = repoParts[0]
      targetRepoOwner = _context.repo.owner
    }
    targetRepo = { owner: targetRepoOwner, repo: targetRepoName }
  } else {
    // ex: .github/release-drafter.yml@main
    targetRepo = _context.repo
  }

  const isCurrentRepo =
    _context.repo.owner === targetRepo.owner &&
    _context.repo.repo === targetRepo.repo

  if (hasRefSpecifier) {
    if (parts.length < 2) throw getErr('Too short to contain ref specifier.')

    const refSpecifier = parts.at(-1)

    if (!refSpecifier) throw getErr('Missing ref specifier.')
    if (!refSpecifier.length) throw getErr('Ref specifier is empty.')
    targetRef = refSpecifier
  } else {
    targetRef = isCurrentRepo ? _context.ref : undefined // default branch
  }

  const filepathIndex = hasRepoSpecifier ? 1 : 0
  const targetFilepath = parts.at(filepathIndex)

  if (!targetFilepath) throw getErr('Missing filepath.')

  return {
    scheme: scheme,
    filepath: targetFilepath,
    ref: targetRef,
    repo: targetRepo
  }
}

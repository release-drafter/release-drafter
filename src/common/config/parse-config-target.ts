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
  context: Pick<ConfigTarget, 'ref' | 'repo'>,
): ConfigTarget {
  let _target = structuredClone(target).trim()

  const getErr = (m: string) =>
    new Error(
      `invalid format: "${_target}". Expected format [github:][owner/repo:]filepath[@ref] or file:filepath. ${m}`,
    )

  if (_target.includes(' ')) {
    throw getErr('Target must not contain spaces.')
  }

  // Parse & pop the scheme, default to "github"
  const scheme = _target.startsWith('file:') ? 'file' : 'github'
  if (_target.startsWith('file:')) _target = _target.slice(5)
  if (_target.startsWith('github:')) _target = _target.slice(7)

  // Check if target is a local file path (no repo specifier)
  let hasRepoSpecifier = _target.includes(':')

  const hasRefSpecifier = _target.includes('@')

  // Ban github specifiers with file scheme
  if (scheme === 'file') {
    if (hasRepoSpecifier)
      throw getErr('Local file targets cannot have ":" github specifiers.')
    if (hasRefSpecifier)
      throw getErr('Local file targets cannot have "@" github specifiers.')
  }

  // Detect repo-only references without ":" (e.g., "org/repo" or "org/repo@ref").
  // Config filepaths always have a file extension, so if there is no ":" and the
  // target (minus any @ref suffix) has no ".", treat it as a repo-only reference.
  if (!hasRepoSpecifier && scheme !== 'file') {
    const targetWithoutRef = hasRefSpecifier
      ? _target.slice(0, _target.indexOf('@'))
      : _target
    if (!targetWithoutRef.includes('.')) {
      // Treat as repo-only: rewrite to "repo:@ref" or "repo:" so normal parsing handles it
      if (hasRefSpecifier) {
        _target = `${targetWithoutRef}:${_target.slice(_target.indexOf('@'))}`
      } else {
        _target = `${_target}:`
      }
      hasRepoSpecifier = true
    }
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
      targetRepoOwner = context.repo.owner
    }
    targetRepo = { owner: targetRepoOwner, repo: targetRepoName }
  } else {
    // ex: .github/release-drafter.yml@main
    targetRepo = context.repo
  }

  const isCurrentRepo =
    context.repo.owner === targetRepo.owner &&
    context.repo.repo === targetRepo.repo

  if (hasRefSpecifier) {
    if (parts.length < 2) throw getErr('Too short to contain ref specifier.')

    const refSpecifier = parts.at(-1)

    if (!refSpecifier) throw getErr('Missing ref specifier.')
    if (!refSpecifier.length) throw getErr('Ref specifier is empty.')
    targetRef = refSpecifier
  } else {
    targetRef = isCurrentRepo ? context.ref : undefined // default branch
  }

  const filepathIndex = hasRepoSpecifier ? 1 : 0
  const targetFilepath = parts.at(filepathIndex) || ''

  return {
    scheme: scheme,
    filepath: targetFilepath,
    ref: targetRef,
    repo: targetRepo,
  }
}

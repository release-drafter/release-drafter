export const parseRepository = (value: string) => {
  const match = /^([^/\s]+)\/([^/\s]+)$/.exec(value)
  if (!match) throw new Error('Repository must use the owner/name format')

  return { owner: match[1], repo: match[2] }
}

type ConfigTargetExists = (target: {
  owner: string
  repo: string
  ref: string
  filepath: string
}) => Promise<boolean>

export const normalizeConfigTarget = async (
  value: string,
  targetExists?: ConfigTargetExists,
) => {
  if (!value.startsWith('https://github.com/')) return value

  const url = new URL(value)
  const [owner, repo, blob, ...parts] = url.pathname.split('/').filter(Boolean)

  if (!owner || !repo || blob !== 'blob' || parts.length < 2) {
    throw new Error('Config URL must point to a file on github.com')
  }

  for (let refLength = 1; refLength < parts.length; refLength++) {
    const ref = parts.slice(0, refLength).join('/')
    const filepath = parts.slice(refLength).join('/')
    if (!targetExists || (await targetExists({ owner, repo, ref, filepath }))) {
      return `${owner}/${repo}:${filepath}@${ref}`
    }
  }

  throw new Error(`Config URL could not be resolved: ${value}`)
}

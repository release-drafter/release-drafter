import { constants } from 'node:fs'
import { isAbsolute, relative, sep } from 'node:path'

const LOCAL_CONFIG_OPEN_FLAGS =
  constants.O_RDONLY |
  (typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0)
const LOCAL_CONFIG_CWD_FLAGS =
  constants.O_RDONLY |
  (typeof constants.O_DIRECTORY === 'number' ? constants.O_DIRECTORY : 0)

export type LocalConfigFileIdentity = {
  dev: number | bigint
  ino: number | bigint
}

export interface LocalConfigFileHandle {
  readFile(options: { encoding: 'utf8' }): string | Promise<string>
  stat(): LocalConfigFileIdentity | Promise<LocalConfigFileIdentity>
  close(): void | Promise<void>
}

export interface LocalConfigFileSystem {
  open(
    path: string,
    flags: number,
  ): LocalConfigFileHandle | Promise<LocalConfigFileHandle>
  realpath(path: string): string | Promise<string>
  stat(path: string): LocalConfigFileIdentity | Promise<LocalConfigFileIdentity>
}

export type LocalConfigFile = {
  contents: string
  canonicalCwd: string
  canonicalPath: string
}

export type LocalConfigFileReader = (
  path: string,
  cwd: string,
) => Promise<LocalConfigFile>

export class LocalConfigFileBoundaryError extends Error {
  constructor(
    message: string,
    readonly reason: 'outside-cwd' | 'changed',
  ) {
    super(message)
    this.name = 'LocalConfigFileBoundaryError'
  }
}

const isWithin = (parent: string, candidate: string): boolean => {
  const relativePath = relative(parent, candidate)
  return Boolean(
    relativePath &&
      relativePath !== '..' &&
      !relativePath.startsWith(`..${sep}`) &&
      !isAbsolute(relativePath),
  )
}

const sameFile = (
  opened: LocalConfigFileIdentity,
  canonical: LocalConfigFileIdentity,
): boolean => opened.dev === canonical.dev && opened.ino === canonical.ino

const assertSameFile = (
  opened: LocalConfigFileIdentity,
  canonical: LocalConfigFileIdentity,
): void => {
  if (!sameFile(opened, canonical)) {
    throw new LocalConfigFileBoundaryError(
      'Local config path changed while it was being opened.',
      'changed',
    )
  }
}

/**
 * Creates a local config reader that opens once and reads only from the
 * validated descriptor. The post-open identity check detects path replacement
 * without re-opening the attacker-controlled lexical path.
 */
export const createLocalConfigFileReader =
  (fileSystem: LocalConfigFileSystem): LocalConfigFileReader =>
  async (path, cwd) => {
    const cwdHandle = await fileSystem.open(cwd, LOCAL_CONFIG_CWD_FLAGS)

    try {
      const canonicalCwd = await fileSystem.realpath(cwd)
      const cwdIdentity = await cwdHandle.stat()
      assertSameFile(cwdIdentity, await fileSystem.stat(canonicalCwd))
      const handle = await fileSystem.open(path, LOCAL_CONFIG_OPEN_FLAGS)

      try {
        const canonicalPath = await fileSystem.realpath(path)
        if (!isWithin(canonicalCwd, canonicalPath)) {
          throw new LocalConfigFileBoundaryError(
            'Local config path must remain within cwd.',
            'outside-cwd',
          )
        }

        const [openedIdentity, canonicalIdentity] = await Promise.all([
          handle.stat(),
          fileSystem.stat(canonicalPath),
        ])
        assertSameFile(openedIdentity, canonicalIdentity)
        assertSameFile(cwdIdentity, await fileSystem.stat(canonicalCwd))

        const contents = await handle.readFile({ encoding: 'utf8' })
        assertSameFile(cwdIdentity, await fileSystem.stat(canonicalCwd))

        return { contents, canonicalCwd, canonicalPath }
      } finally {
        await handle.close()
      }
    } finally {
      await cwdHandle.close()
    }
  }

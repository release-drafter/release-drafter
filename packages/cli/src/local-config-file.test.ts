import { constants } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import {
  createLocalConfigFileReader,
  type LocalConfigFileHandle,
  type LocalConfigFileIdentity,
  type LocalConfigFileSystem,
} from './local-config-file.js'

const CWD = '/checkout-link'
const FILE = '/checkout-link/configs/release.yml'
const CANONICAL_CWD = '/real/checkout'
const CANONICAL_FILE = '/real/checkout/configs/release.yml'
const CWD_FLAGS =
  constants.O_RDONLY |
  (typeof constants.O_DIRECTORY === 'number' ? constants.O_DIRECTORY : 0)
const FILE_FLAGS =
  constants.O_RDONLY |
  (typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0)

const identity = (ino: number): LocalConfigFileIdentity => ({ dev: 1, ino })

const setup = ({
  cwdOpenedIdentity = identity(10),
  fileOpenedIdentity = identity(1),
  fileCanonicalIdentity = fileOpenedIdentity,
  contents = 'template: local\n',
}: {
  cwdOpenedIdentity?: LocalConfigFileIdentity
  fileOpenedIdentity?: LocalConfigFileIdentity
  fileCanonicalIdentity?: LocalConfigFileIdentity
  contents?: string
} = {}) => {
  const cwdHandle: LocalConfigFileHandle = {
    readFile: vi.fn(),
    stat: vi.fn(async () => cwdOpenedIdentity),
    close: vi.fn(async () => undefined),
  }
  const fileHandle: LocalConfigFileHandle = {
    readFile: vi.fn(async () => contents),
    stat: vi.fn(async () => fileOpenedIdentity),
    close: vi.fn(async () => undefined),
  }
  const fileSystem: LocalConfigFileSystem = {
    open: vi.fn(async (path: string) =>
      path === CWD ? cwdHandle : fileHandle,
    ),
    realpath: vi.fn(async (path: string) => {
      if (path === CWD) return CANONICAL_CWD
      if (path === FILE) return CANONICAL_FILE
      throw new Error(`Unexpected path: ${path}`)
    }),
    stat: vi.fn(async (path: string) =>
      path === CANONICAL_CWD ? cwdOpenedIdentity : fileCanonicalIdentity,
    ),
  }
  return {
    cwdHandle,
    fileHandle,
    fileSystem,
    read: createLocalConfigFileReader(fileSystem),
  }
}

describe('local config file reader', () => {
  it('anchors a symlinked cwd and reads from one validated file descriptor', async () => {
    const { cwdHandle, fileHandle, fileSystem, read } = setup()

    await expect(read(FILE, CWD)).resolves.toEqual({
      contents: 'template: local\n',
      canonicalCwd: CANONICAL_CWD,
      canonicalPath: CANONICAL_FILE,
    })

    expect(fileSystem.open).toHaveBeenNthCalledWith(1, CWD, CWD_FLAGS)
    expect(fileSystem.open).toHaveBeenNthCalledWith(2, FILE, FILE_FLAGS)
    expect(fileSystem.stat).toHaveBeenCalledWith(CANONICAL_FILE)
    expect(fileSystem.stat).toHaveBeenCalledWith(CANONICAL_CWD)
    expect(fileHandle.readFile).toHaveBeenCalledWith({ encoding: 'utf8' })
    expect(fileHandle.close).toHaveBeenCalledTimes(1)
    expect(cwdHandle.close).toHaveBeenCalledTimes(1)
  })

  it('rejects a final path swap when the canonical path names a different file', async () => {
    const { cwdHandle, fileHandle, read } = setup({
      fileCanonicalIdentity: identity(2),
    })

    await expect(read(FILE, CWD)).rejects.toMatchObject({ reason: 'changed' })
    expect(fileHandle.readFile).not.toHaveBeenCalled()
    expect(fileHandle.close).toHaveBeenCalledTimes(1)
    expect(cwdHandle.close).toHaveBeenCalledTimes(1)
  })

  it('rejects a parent symlink swap outside the canonical cwd', async () => {
    const { cwdHandle, fileHandle, fileSystem, read } = setup()
    vi.mocked(fileSystem.realpath).mockImplementation(async (path: string) =>
      path === CWD ? CANONICAL_CWD : '/outside/configs/release.yml',
    )

    await expect(read(FILE, CWD)).rejects.toMatchObject({
      reason: 'outside-cwd',
    })
    expect(fileHandle.readFile).not.toHaveBeenCalled()
    expect(fileHandle.close).toHaveBeenCalledTimes(1)
    expect(cwdHandle.close).toHaveBeenCalledTimes(1)
  })

  it('rejects replacement of the canonical cwd before opening the file', async () => {
    const { cwdHandle, fileHandle, fileSystem, read } = setup()
    vi.mocked(fileSystem.stat).mockImplementation(async (path: string) =>
      path === CANONICAL_CWD ? identity(11) : identity(1),
    )

    await expect(read(FILE, CWD)).rejects.toMatchObject({ reason: 'changed' })
    expect(fileSystem.open).toHaveBeenCalledTimes(1)
    expect(fileHandle.readFile).not.toHaveBeenCalled()
    expect(fileHandle.close).not.toHaveBeenCalled()
    expect(cwdHandle.close).toHaveBeenCalledTimes(1)
  })

  it('rejects replacement of the canonical cwd after opening the file', async () => {
    const { cwdHandle, fileHandle, fileSystem, read } = setup()
    let cwdChecks = 0
    vi.mocked(fileSystem.stat).mockImplementation(async (path: string) => {
      if (path !== CANONICAL_CWD) return identity(1)
      cwdChecks += 1
      return cwdChecks === 1 ? identity(10) : identity(11)
    })

    await expect(read(FILE, CWD)).rejects.toMatchObject({ reason: 'changed' })
    expect(fileHandle.readFile).not.toHaveBeenCalled()
    expect(fileHandle.close).toHaveBeenCalledTimes(1)
    expect(cwdHandle.close).toHaveBeenCalledTimes(1)
  })

  it('rejects replacement of the canonical cwd during the descriptor read', async () => {
    const { cwdHandle, fileHandle, fileSystem, read } = setup()
    let cwdChecks = 0
    vi.mocked(fileSystem.stat).mockImplementation(async (path: string) => {
      if (path !== CANONICAL_CWD) return identity(1)
      cwdChecks += 1
      return cwdChecks < 3 ? identity(10) : identity(11)
    })

    await expect(read(FILE, CWD)).rejects.toMatchObject({ reason: 'changed' })
    expect(fileHandle.readFile).toHaveBeenCalledTimes(1)
    expect(fileHandle.close).toHaveBeenCalledTimes(1)
    expect(cwdHandle.close).toHaveBeenCalledTimes(1)
  })

  it('closes both descriptors when file canonicalization fails', async () => {
    const { cwdHandle, fileHandle, fileSystem, read } = setup()
    vi.mocked(fileSystem.realpath)
      .mockResolvedValueOnce(CANONICAL_CWD)
      .mockRejectedValueOnce(new Error('realpath failed'))

    await expect(read(FILE, CWD)).rejects.toThrow('realpath failed')
    expect(fileHandle.close).toHaveBeenCalledTimes(1)
    expect(cwdHandle.close).toHaveBeenCalledTimes(1)
  })

  it('closes both descriptors when reading fails', async () => {
    const { cwdHandle, fileHandle, read } = setup()
    vi.mocked(fileHandle.readFile).mockRejectedValue(new Error('read failed'))

    await expect(read(FILE, CWD)).rejects.toThrow('read failed')
    expect(fileHandle.close).toHaveBeenCalledTimes(1)
    expect(cwdHandle.close).toHaveBeenCalledTimes(1)
  })

  it('rejects a final symlink when the no-follow file open fails', async () => {
    const { cwdHandle, fileHandle, fileSystem, read } = setup()
    const noFollowError = Object.assign(new Error('final symlink rejected'), {
      code: 'ELOOP',
    })
    vi.mocked(fileSystem.open)
      .mockResolvedValueOnce(cwdHandle)
      .mockRejectedValueOnce(noFollowError)

    await expect(read(FILE, CWD)).rejects.toMatchObject({ code: 'ELOOP' })
    expect(fileHandle.close).not.toHaveBeenCalled()
    expect(cwdHandle.close).toHaveBeenCalledTimes(1)
  })

  it('surfaces a file close error and still closes the cwd descriptor', async () => {
    const { cwdHandle, fileHandle, read } = setup()
    vi.mocked(fileHandle.close).mockRejectedValue(new Error('close failed'))

    await expect(read(FILE, CWD)).rejects.toThrow('close failed')
    expect(fileHandle.readFile).toHaveBeenCalledTimes(1)
    expect(fileHandle.close).toHaveBeenCalledTimes(1)
    expect(cwdHandle.close).toHaveBeenCalledTimes(1)
  })
})

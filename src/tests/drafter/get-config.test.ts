import { describe, expect, it } from 'vitest'
import { getConfig } from '#src/actions/drafter/config/get-config.ts'
import { mocks } from '#tests/mocks/index.ts'

describe('get drafter config', () => {
  it('logs the file path and ref for every fetched remote config', async () => {
    mocks.config.mockReturnValue('config')
    mocks.getContextsConfigWasFetchedFrom.mockReturnValue([
      {
        filepath: '.github/release-drafter.yml',
        scheme: 'github',
        ref: 'main',
        repo: { owner: 'octocat', repo: 'hello-world' },
      },
      {
        filepath: '.github/base.yml',
        scheme: 'github',
        ref: undefined,
        repo: { owner: 'octocat', repo: '.github' },
      },
    ])

    await getConfig('release-drafter.yml')

    expect(mocks.core.info).toHaveBeenCalledWith(
      'Config fetched from "octocat/hello-world/.github/release-drafter.yml@main".',
    )
    expect(mocks.core.info).toHaveBeenCalledWith(
      'Config fetched from "octocat/.github/.github/base.yml" on the default branch.',
    )
  })

  it('logs the file path for a locally fetched config', async () => {
    mocks.config.mockReturnValue('config')
    mocks.getContextsConfigWasFetchedFrom.mockReturnValue([
      {
        filepath: 'config/release-drafter.yml',
        scheme: 'file',
        ref: 'main',
        repo: { owner: 'octocat', repo: 'hello-world' },
      },
    ])

    await getConfig('release-drafter.yml')

    expect(mocks.core.info).toHaveBeenCalledWith(
      'Config fetched locally from "config/release-drafter.yml".',
    )
  })
})

import * as core from '@actions/core'
import { describe, expect, it, vi } from 'vitest'
import { setActionOutput } from './set-action-output.ts'

describe('Drafter Action outputs', () => {
  it('preserves the complete output contract from a normalized core result', () => {
    setActionOutput({
      plan: {
        action: 'create',
        releasePayload: {
          name: 'computed name',
          tag: 'v2.3.4',
          body: 'release body',
          targetCommitish: 'main',
          prerelease: false,
          makeLatest: true,
          draft: true,
          resolvedVersion: '2.3.4',
          majorVersion: '2',
          minorVersion: '3',
          patchVersion: '4',
        },
      },
      release: {
        id: 42,
        name: 'created name',
        tagName: 'v2.3.4',
        url: 'https://github.test/releases/42',
        uploadUrl: 'https://uploads.github.test/releases/42/assets',
      },
      releasePayload: {
        name: 'computed name',
        tag: 'v2.3.4',
        body: 'release body',
        targetCommitish: 'main',
        prerelease: false,
        makeLatest: true,
        draft: true,
        resolvedVersion: '2.3.4',
        majorVersion: '2',
        minorVersion: '3',
        patchVersion: '4',
      },
    })

    expect(vi.mocked(core.setOutput).mock.calls).toEqual([
      ['id', '42'],
      ['html_url', 'https://github.test/releases/42'],
      ['upload_url', 'https://uploads.github.test/releases/42/assets'],
      ['tag_name', 'v2.3.4'],
      ['name', 'created name'],
      ['resolved_version', '2.3.4'],
      ['major_version', '2'],
      ['minor_version', '3'],
      ['patch_version', '4'],
      ['body', 'release body'],
    ])
  })
})

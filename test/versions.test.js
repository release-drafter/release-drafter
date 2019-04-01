const { getVersionInfo } = require('../lib/versions')

describe('versions', () => {
  it('extracts a version-like string from the last tag', () => {
    const versionInfo = getVersionInfo({
      tag_name: 'v10.0.3',
      name: 'Some release'
    })

    expect(versionInfo.incrementedMajor).toEqual('11.0.0')
    expect(versionInfo.incrementedMinor).toEqual('10.1.0')
    expect(versionInfo.incrementedPatch).toEqual('10.0.4')
  })

  it('extracts a version-like string from the last release name if the tag isnt a version', () => {
    const versionInfo = getVersionInfo({
      tag_name: 'notaproperversion',
      name: '10.0.3'
    })

    expect(versionInfo.incrementedMajor).toEqual('11.0.0')
    expect(versionInfo.incrementedMinor).toEqual('10.1.0')
    expect(versionInfo.incrementedPatch).toEqual('10.0.4')
  })

  it('preferences tags over release names', () => {
    const versionInfo = getVersionInfo({
      tag_name: '10.0.3',
      name: '8.1.0'
    })

    expect(versionInfo.incrementedMajor).toEqual('11.0.0')
    expect(versionInfo.incrementedMinor).toEqual('10.1.0')
    expect(versionInfo.incrementedPatch).toEqual('10.0.4')
  })

  it('handles alpha/beta releases', () => {
    const versionInfo = getVersionInfo({
      tag_name: 'v10.0.3-alpha',
      name: 'Some release'
    })

    expect(versionInfo.incrementedMajor).toEqual('11.0.0')
    expect(versionInfo.incrementedMinor).toEqual('10.1.0')
    expect(versionInfo.incrementedPatch).toEqual('10.0.4')
  })

  it('returns undefined if no version was found in tag or name', () => {
    const versionInfo = getVersionInfo({
      tag_name: 'nope',
      name: 'nope nope nope'
    })

    expect(versionInfo).toEqual(undefined)
  })

  it('extracts a non-semvar version when patchVersions is false', () => {
    const versionInfo = getVersionInfo(
      {
        tag_name: 'v10.0.3',
        name: 'Some release'
      },
      false
    )

    expect(versionInfo.incrementedMajor).toEqual('11.0')
    expect(versionInfo.incrementedMinor).toEqual('10.1')
    expect(versionInfo.incrementedPatch).toBeUndefined()
  })
})

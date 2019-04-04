const { getVersionInfo } = require('../lib/versions')

describe('versions', () => {
  it('extracts a version-like string from the last tag', () => {
    const versionInfo = getVersionInfo({
      tag_name: 'v10.0.3',
      name: 'Some release'
    })

    expect(versionInfo.$NEXT_MAJOR_VERSION.version).toEqual('11.0.0')
    expect(versionInfo.$NEXT_MINOR_VERSION.version).toEqual('10.1.0')
    expect(versionInfo.$NEXT_PATCH_VERSION.version).toEqual('10.0.4')
  })

  it('extracts a version-like string from the last release name if the tag isnt a version', () => {
    const versionInfo = getVersionInfo({
      tag_name: 'notaproperversion',
      name: '10.0.3'
    })

    expect(versionInfo.$NEXT_MAJOR_VERSION.version).toEqual('11.0.0')
    expect(versionInfo.$NEXT_MINOR_VERSION.version).toEqual('10.1.0')
    expect(versionInfo.$NEXT_PATCH_VERSION.version).toEqual('10.0.4')
  })

  it('preferences tags over release names', () => {
    const versionInfo = getVersionInfo({
      tag_name: '10.0.3',
      name: '8.1.0'
    })

    expect(versionInfo.$NEXT_MAJOR_VERSION.version).toEqual('11.0.0')
    expect(versionInfo.$NEXT_MINOR_VERSION.version).toEqual('10.1.0')
    expect(versionInfo.$NEXT_PATCH_VERSION.version).toEqual('10.0.4')
  })

  it('handles alpha/beta releases', () => {
    const versionInfo = getVersionInfo({
      tag_name: 'v10.0.3-alpha',
      name: 'Some release'
    })

    expect(versionInfo.$NEXT_MAJOR_VERSION.version).toEqual('11.0.0')
    expect(versionInfo.$NEXT_MINOR_VERSION.version).toEqual('10.1.0')
    expect(versionInfo.$NEXT_PATCH_VERSION.version).toEqual('10.0.4')
  })

  it('returns undefined if no version was found in tag or name', () => {
    const versionInfo = getVersionInfo({
      tag_name: 'nope',
      name: 'nope nope nope'
    })

    expect(versionInfo).toEqual(undefined)
  })
})

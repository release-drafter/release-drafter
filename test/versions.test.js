const {
  getVersionInfo,
  incrementVersionBasedOnLabels
} = require('../lib/versions')

describe('version info', () => {
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

describe('increment version based on labels', () => {
  it('bumps by a patch number if there are no labels on PRs', () => {
    const lastRelease = {
      tag_name: '1.0.0',
      name: 'Some major release'
    }
    const prs = [{ labels: [{ name: 'irrelevant' }] }]
    const resolvedVersion = incrementVersionBasedOnLabels(lastRelease, prs)

    expect(resolvedVersion).toEqual('1.0.1')
  })
  it('bumps by a patch if there are only PATCH or other irrelevant labels on PRs', () => {
    const lastRelease = {
      tag_name: '1.0.0',
      name: 'Some major release'
    }
    const prs = [
      { labels: [{ name: 'PATCH' }, { name: 'irrelevant' }] },
      { labels: [{ name: 'foobar' }] }
    ]
    const resolvedVersion = incrementVersionBasedOnLabels(lastRelease, prs)

    expect(resolvedVersion).toEqual('1.0.1')
  })
  it('bumps by a minor version if there are only MINOR, PATCH or irrelevant labels on PRs', () => {
    const lastRelease = {
      tag_name: '1.0.0',
      name: 'Some major release'
    }
    const prs = [
      { labels: [{ name: 'MINOR' }, { name: 'irrelevant' }] },
      { labels: [{ name: 'PATCH' }] },
      { labels: [{ name: 'foobar' }] }
    ]
    const resolvedVersion = incrementVersionBasedOnLabels(lastRelease, prs)

    expect(resolvedVersion).toEqual('1.1.0')
  })
  it('bumps by a major version if there is a MAJOR label on any of the PRs', () => {
    const lastRelease = {
      tag_name: '1.0.0',
      name: 'Some major release'
    }
    const prs = [
      { labels: [{ name: 'MINOR' }, { name: 'irrelevant' }] },
      { labels: [{ name: 'PATCH' }] },
      { labels: [{ name: 'MAJOR' }] },
      { labels: [{ name: 'foobar' }] }
    ]
    const resolvedVersion = incrementVersionBasedOnLabels(lastRelease, prs)

    expect(resolvedVersion).toEqual('2.0.0')
  })
})

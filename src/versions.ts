import semver from 'semver'

interface Release {
  tag_name: string
  name: string
}

const splitSemVer = (input: {
  lastVersion: semver.SemVer
  inc: semver.ReleaseType
}) => {
  const version = semver.inc(input.lastVersion, input.inc, true)

  return {
    ...input,
    version,
    $MAJOR: version ? semver.major(version) : null,
    $MINOR: version ? semver.minor(version) : null,
    $PATCH: version ? semver.patch(version) : null
  }
}

const lastVersionSemVerIncremented = (input: {
  lastVersion: semver.SemVer
  template: string
}) => ({
  $NEXT_MAJOR_VERSION: splitSemVer({ ...input, inc: 'major' }),
  $NEXT_MINOR_VERSION: splitSemVer({ ...input, inc: 'minor' }),
  $NEXT_PATCH_VERSION: splitSemVer({ ...input, inc: 'patch' })
})

export const getVersionInfo = (lastRelease: Release, template: string) => {
  const lastVersion =
    semver.coerce(lastRelease.tag_name) || semver.coerce(lastRelease.name)

  if (!lastVersion) {
    return null
  }

  return lastVersionSemVerIncremented({
    lastVersion,
    template
  })
}

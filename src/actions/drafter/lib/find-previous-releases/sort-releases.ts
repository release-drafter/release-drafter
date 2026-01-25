import { Config } from 'src/types'
import regexEscape from 'escape-string-regexp'
import compareVersions from 'compare-versions'
import { Octokit } from 'src/common/get-octokit'

export const sortReleases = (params: {
  releases: Awaited<
    ReturnType<Octokit['rest']['repos']['listReleases']>
  >['data']
  tagPrefix: Config['tag-prefix']
}) => {
  // For semver, we find the greatest release number
  // For non-semver, we use the most recently merged
  const tagPrefixRexExp = params.tagPrefix
    ? new RegExp(`^${regexEscape(params.tagPrefix)}`)
    : undefined

  return params.releases.sort((r1, r2) => {
    const tag_name_1 = tagPrefixRexExp
      ? r1.tag_name.replace(tagPrefixRexExp, '')
      : r1.tag_name
    const tag_name_2 = tagPrefixRexExp
      ? r2.tag_name.replace(tagPrefixRexExp, '')
      : r2.tag_name

    try {
      return compareVersions(tag_name_1, tag_name_2)
    } catch {
      return (
        new Date(r1.created_at).getTime() - new Date(r2.created_at).getTime()
      )
    }
  })
}

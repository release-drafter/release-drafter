export type ActionOutptuts = {
  /**
   * The ID of the release that was created or updated.
   */
  id: number
  /**
   * The name of the release
   */
  name: string
  /**
   * The name of the tag associated with the release.
   */
  tag_name: string
  /**
   * The body of the drafted release.
   */
  body: string
  /**
   * The URL users can navigate to in order to view the release
   */
  html_url: string
  /**
   * The URL for uploading assets to the release, which could be used by GitHub Actions for additional uses, for example the @actions/upload-release-asset GitHub Action.
   */
  upload_url: string
  /**
   * The next major version number. For example, if the last tag or release was v1.2.3, the value would be v2.0.0.
   */
  major_version: string
  /**
   * The next minor version number. For example, if the last tag or release was v1.2.3, the value would be v1.3.0.
   */
  minor_version: string
  /**
   * The next patch version number. For example, if the last tag or release was v1.2.3, the value would be v1.2.4.
   */
  patch_version: string
  /**
   * The next resolved version number, based on GitHub labels.
   */
  resolved_version: string
}

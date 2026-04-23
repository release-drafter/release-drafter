import * as core from '@actions/core'
import type { ReleaseType, SemVer } from 'semver'
import coerce from 'semver/functions/coerce'
import inc from 'semver/functions/inc'
import major from 'semver/functions/major'
import minor from 'semver/functions/minor'
import parse from 'semver/functions/parse'
import patch from 'semver/functions/patch'
import prerelease from 'semver/functions/prerelease'
import type { Config } from 'src/actions/drafter/config'
import type { findPreviousReleases } from '../find-previous-releases'
import { renderTemplate } from './render-template'

type Release = Exclude<
  Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease'],
  undefined
>

export class VersionDescriptor {
  public version: SemVer | null = null

  public major: string | null = null
  public minor: string | null = null
  public patch: string | null = null
  public prerelease: string | null = null

  public preReleaseIdentifier?: string
  public tagPrefix?: string

  constructor(
    from: SemVer | Pick<Release, 'tag_name' | 'name'> | string | undefined,
    opt?: {
      preReleaseIdentifier?: string
      tagPrefix?: Config['tag-prefix']
    },
  ) {
    this.preReleaseIdentifier = opt?.preReleaseIdentifier
    this.tagPrefix = opt?.tagPrefix

    this.version = this._coerce(from)

    this.major = this.version ? major(this.version).toString() : null
    this.minor = this.version ? minor(this.version).toString() : null
    this.patch = this.version ? patch(this.version).toString() : null
    this.prerelease =
      this.version === null
        ? null
        : prerelease(this.version)
          ? `-${prerelease(this.version)?.join('.')}`
          : ''
  }

  private _coerce(
    from: SemVer | Pick<Release, 'tag_name' | 'name'> | string | undefined,
  ) {
    if (from) {
      const ver =
        typeof from === 'object'
          ? this._isRelease(from)
            ? this._toSemver(this._stripTag(from.tag_name)) ||
              this._toSemver(this._stripTag(from.name))
            : this._toSemver(from)
          : this._toSemver(this._stripTag(from))

      if (!ver) {
        core.warning(
          `Failed to parse version from input ${from}. Defaulting coerced version to null.`,
        )
        return null
      }
      return ver
    } else {
      core.debug(
        `Building version descriptor without version input. Defaulting coerced version to null.`,
      )
      return null
    }
  }

  private _isRelease(
    input: unknown,
  ): input is Pick<Release, 'tag_name' | 'name'> {
    return (
      typeof input === 'object' &&
      input !== null &&
      (typeof (input as Pick<Release, 'tag_name' | 'name'>)?.tag_name ===
        'string' ||
        typeof (input as Pick<Release, 'tag_name' | 'name'>)?.name === 'string')
    )
  }

  private _stripTag(input?: string | null) {
    return !!this.tagPrefix && input?.startsWith(this.tagPrefix)
      ? input.slice(this.tagPrefix.length)
      : input
  }

  private _toSemver(version?: string | SemVer | null | undefined) {
    const result = parse(version)
    if (result) {
      return result
    }

    // doesn't handle prerelease
    return coerce(version)
  }

  /**
   * Alters version in-place by incrementing it according to the specified release type (major, minor, patch, prerelease).
   */
  public incremented(increment: ReleaseType | 'no_increment') {
    if (!this.version || increment === 'no_increment') {
      return this
    }

    const _incrementedVersion = inc(
      this.version,
      increment,
      true,
      this.preReleaseIdentifier,
    )

    if (!_incrementedVersion) {
      throw new Error(
        `Failed to increment version ${this.version} with increment ${increment}`,
      )
    }

    const _incrementedSemver = this._toSemver(_incrementedVersion)

    if (!_incrementedSemver) {
      throw new Error(
        `Failed to parse version ${_incrementedVersion} after incrementing ${this.version} with increment ${increment}`,
      )
    }

    return new VersionDescriptor(_incrementedSemver, {
      tagPrefix: this.tagPrefix,
      preReleaseIdentifier: this.preReleaseIdentifier,
    })
  }

  public rendered(template: string) {
    return renderTemplate({
      template,
      object: {
        $MAJOR: this.major ?? undefined,
        $MINOR: this.minor ?? undefined,
        $PATCH: this.patch ?? undefined,
        $PRERELEASE: this.prerelease ?? undefined,
      },
    })
  }
}

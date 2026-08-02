import type { ReleaseType, SemVer } from 'semver'
import coerce from 'semver/functions/coerce.js'
import inc from 'semver/functions/inc.js'
import major from 'semver/functions/major.js'
import minor from 'semver/functions/minor.js'
import parse from 'semver/functions/parse.js'
import patch from 'semver/functions/patch.js'
import prerelease from 'semver/functions/prerelease.js'
import type { Config } from '../config/config.schema.ts'
import type { Logger } from '../ports.ts'
import type { Release } from '../types.ts'
import { renderTemplate } from './render-template/index.ts'

export class VersionDescriptor {
  public version: SemVer | null = null
  public major: string | null = null
  public minor: string | null = null
  public patch: string | null = null
  public prerelease: string | null = null
  public preReleaseIdentifier?: string
  public tagPrefix?: string
  private readonly logger: Logger

  constructor(
    from: SemVer | Pick<Release, 'tagName' | 'name'> | string | undefined,
    opt: {
      logger: Logger
      preReleaseIdentifier?: string
      tagPrefix?: Config['tag-prefix']
    },
  ) {
    this.logger = opt.logger
    this.preReleaseIdentifier = opt.preReleaseIdentifier
    this.tagPrefix = opt.tagPrefix
    this.version = this.coerce(from)
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

  private coerce(
    from: SemVer | Pick<Release, 'tagName' | 'name'> | string | undefined,
  ) {
    if (!from) {
      this.logger.debug(
        'Building version descriptor without version input. Defaulting coerced version to null.',
      )
      return null
    }
    const version =
      typeof from === 'object'
        ? this.isRelease(from)
          ? this.toSemver(this.stripTag(from.tagName)) ||
            this.toSemver(this.stripTag(from.name))
          : this.toSemver(from)
        : this.toSemver(this.stripTag(from))
    if (version) return version
    this.logger.warning(
      `Failed to parse version from input ${String(from)}. Defaulting coerced version to null.`,
    )
    return null
  }

  private isRelease(
    input: unknown,
  ): input is Pick<Release, 'tagName' | 'name'> {
    return (
      typeof input === 'object' &&
      input !== null &&
      (typeof (input as Pick<Release, 'tagName' | 'name'>).tagName ===
        'string' ||
        typeof (input as Pick<Release, 'tagName' | 'name'>).name === 'string')
    )
  }

  private stripTag(input?: string | null) {
    return this.tagPrefix && input?.startsWith(this.tagPrefix)
      ? input.slice(this.tagPrefix.length)
      : input
  }

  private toSemver(version?: string | SemVer | null) {
    return parse(version) || coerce(version)
  }

  public incremented(increment: ReleaseType | 'no_increment') {
    if (!this.version || increment === 'no_increment') return this
    const incrementedVersion = inc(
      this.version,
      increment,
      true,
      this.preReleaseIdentifier,
    )
    if (!incrementedVersion) {
      throw new Error(
        `Failed to increment version ${this.version} with increment ${increment}`,
      )
    }
    const incrementedSemver = this.toSemver(incrementedVersion)
    if (!incrementedSemver) {
      throw new Error(
        `Failed to parse version ${incrementedVersion} after incrementing ${this.version} with increment ${increment}`,
      )
    }
    return new VersionDescriptor(incrementedSemver, {
      logger: this.logger,
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

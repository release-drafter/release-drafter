import {
  coerce,
  getMajor,
  getMinor,
  getPatch,
  getPrerelease,
  type IncrementType,
  increment,
  normalize,
  type SemVer,
  tryParse,
} from 'verkit'
import type { Config } from '../config/config.schema.ts'
import type { Logger } from '../ports.ts'
import type { Release } from '../types.ts'
import { renderTemplate } from './render-template/index.ts'

type ReleaseType = Exclude<IncrementType, 'release'>

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
    this.major = this.version ? getMajor(this.version).toString() : null
    this.minor = this.version ? getMinor(this.version).toString() : null
    this.patch = this.version ? getPatch(this.version).toString() : null
    const prerelease = this.version ? getPrerelease(this.version) : null
    this.prerelease = this.version
      ? prerelease?.length
        ? `-${prerelease.join('.')}`
        : ''
      : null
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
    if (!version) return null
    const parsedVersion = tryParse(version)
    if (parsedVersion) return parsedVersion
    const coercedVersion = coerce(version)
    return coercedVersion ? tryParse(coercedVersion) : null
  }

  public incremented(incrementType: ReleaseType | 'no_increment') {
    if (!this.version || incrementType === 'no_increment') return this
    const incrementedVersion = increment(this.version, incrementType, {
      loose: true,
      identifier: this.preReleaseIdentifier,
    })
    if (!incrementedVersion) {
      throw new Error(
        `Failed to increment version ${normalize(this.version)} with increment ${incrementType}`,
      )
    }
    const incrementedSemver = this.toSemver(incrementedVersion)
    if (!incrementedSemver) {
      throw new Error(
        `Failed to parse version ${incrementedVersion} after incrementing ${normalize(this.version)} with increment ${incrementType}`,
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

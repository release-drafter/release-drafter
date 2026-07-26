import type { ReleaseType, SemVer } from 'semver';
import type { Config } from '../../config/index.js';
import { type Logger } from '../../../../common/index.js';
import type { findPreviousReleases } from '../find-previous-releases/index.js';
type Release = Exclude<Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease'], undefined>;
export declare class VersionDescriptor {
    version: SemVer | null;
    major: string | null;
    minor: string | null;
    patch: string | null;
    prerelease: string | null;
    preReleaseIdentifier?: string;
    tagPrefix?: string;
    private logger;
    constructor(from: SemVer | Pick<Release, 'tag_name' | 'name'> | string | undefined, opt: {
        preReleaseIdentifier?: string;
        tagPrefix?: Config['tag-prefix'];
        logger?: Logger;
    });
    private _coerce;
    private _isRelease;
    private _stripTag;
    private _toSemver;
    /**
     * Alters version in-place by incrementing it according to the specified release type (major, minor, patch, prerelease).
     */
    incremented(increment: ReleaseType | 'no_increment'): VersionDescriptor;
    rendered(template: string): string;
}
export {};

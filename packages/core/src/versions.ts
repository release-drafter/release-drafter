import semver from 'semver'

const splitSemVersion = (input: {
	version?: semver.SemVer
	template: string
	inc?: semver.ReleaseType
}) => {
	if (!input.version) {
		return
	}

	const version: semver.SemVer | string = input.inc
		? (semver.inc(input.version, input.inc, true) as string)
		: input.version.version

	return {
		...input,
		version,
		$MAJOR: semver.major(version),
		$MINOR: semver.minor(version),
		$PATCH: semver.patch(version),
		$COMPLETE: version,
	}
}

export const defaultVersionInfo = {
	$NEXT_MAJOR_VERSION: {
		version: '1.0.0',
		template: '$MAJOR.$MINOR.$PATCH',
		inputVersion: undefined,
		versionKeyIncrement: 'patch',
		inc: 'major',
		$MAJOR: 1,
		$MINOR: 0,
		$PATCH: 0,
	},
	$NEXT_MAJOR_VERSION_MAJOR: {
		version: '1.0.0',
		template: '$MAJOR',
		inputVersion: undefined,
		versionKeyIncrement: 'patch',
		inc: 'major',
		$MAJOR: 1,
		$MINOR: 0,
		$PATCH: 0,
	},
	$NEXT_MAJOR_VERSION_MINOR: {
		version: '1.0.0',
		template: '$MINOR',
		inputVersion: undefined,
		versionKeyIncrement: 'patch',
		inc: 'major',
		$MAJOR: 1,
		$MINOR: 0,
		$PATCH: 0,
	},
	$NEXT_MAJOR_VERSION_PATCH: {
		version: '1.0.0',
		template: '$PATCH',
		inputVersion: undefined,
		versionKeyIncrement: 'patch',
		inc: 'major',
		$MAJOR: 1,
		$MINOR: 0,
		$PATCH: 0,
	},
	$NEXT_MINOR_VERSION: {
		version: '0.1.0',
		template: '$MAJOR.$MINOR.$PATCH',
		inputVersion: undefined,
		versionKeyIncrement: 'patch',
		inc: 'minor',
		$MAJOR: 0,
		$MINOR: 1,
		$PATCH: 0,
	},
	$NEXT_MINOR_VERSION_MAJOR: {
		version: '0.1.0',
		template: '$MAJOR',
		inputVersion: undefined,
		versionKeyIncrement: 'patch',
		inc: 'minor',
		$MAJOR: 0,
		$MINOR: 1,
		$PATCH: 0,
	},
	$NEXT_MINOR_VERSION_MINOR: {
		version: '0.1.0',
		template: '$MINOR',
		inputVersion: undefined,
		versionKeyIncrement: 'patch',
		inc: 'minor',
		$MAJOR: 0,
		$MINOR: 1,
		$PATCH: 0,
	},
	$NEXT_MINOR_VERSION_PATCH: {
		version: '0.1.0',
		template: '$PATCH',
		inputVersion: undefined,
		versionKeyIncrement: 'patch',
		inc: 'minor',
		$MAJOR: 0,
		$MINOR: 1,
		$PATCH: 0,
	},
	$NEXT_PATCH_VERSION: {
		version: '0.1.0',
		template: '$MAJOR.$MINOR.$PATCH',
		inputVersion: undefined,
		versionKeyIncrement: 'patch',
		inc: 'patch',
		$MAJOR: 0,
		$MINOR: 1,
		$PATCH: 0,
	},
	$NEXT_PATCH_VERSION_MAJOR: {
		version: '0.1.0',
		template: '$MAJOR',
		inputVersion: undefined,
		versionKeyIncrement: 'patch',
		inc: 'patch',
		$MAJOR: 0,
		$MINOR: 1,
		$PATCH: 0,
	},
	$NEXT_PATCH_VERSION_MINOR: {
		version: '0.1.0',
		template: '$MINOR',
		inputVersion: undefined,
		versionKeyIncrement: 'patch',
		inc: 'patch',
		$MAJOR: 0,
		$MINOR: 1,
		$PATCH: 0,
	},
	$NEXT_PATCH_VERSION_PATCH: {
		version: '0.1.0',
		template: '$PATCH',
		inputVersion: undefined,
		versionKeyIncrement: 'patch',
		inc: 'patch',
		$MAJOR: 0,
		$MINOR: 1,
		$PATCH: 0,
	},
	$INPUT_VERSION: undefined,
	$RESOLVED_VERSION: {
		version: '0.1.0',
		template: '$MAJOR.$MINOR.$PATCH',
		inputVersion: undefined,
		versionKeyIncrement: 'patch',
		inc: 'patch',
		$MAJOR: 0,
		$MINOR: 1,
		$PATCH: 0,
	},
}

export function getTemplatableVersion(input: {
	version: semver.SemVer
	template: string
	versionInput?: semver.SemVer
	versionKeyIncrement?: semver.ReleaseType
}) {
	const templatableVersion = {
		$NEXT_MAJOR_VERSION: splitSemVersion({ ...input, inc: 'major' }),
		$NEXT_MAJOR_VERSION_MAJOR: splitSemVersion({
			...input,
			inc: 'major',
			template: '$MAJOR',
		}),
		$NEXT_MAJOR_VERSION_MINOR: splitSemVersion({
			...input,
			inc: 'major',
			template: '$MINOR',
		}),
		$NEXT_MAJOR_VERSION_PATCH: splitSemVersion({
			...input,
			inc: 'major',
			template: '$PATCH',
		}),
		$NEXT_MINOR_VERSION: splitSemVersion({ ...input, inc: 'minor' }),
		$NEXT_MINOR_VERSION_MAJOR: splitSemVersion({
			...input,
			inc: 'minor',
			template: '$MAJOR',
		}),
		$NEXT_MINOR_VERSION_MINOR: splitSemVersion({
			...input,
			inc: 'minor',
			template: '$MINOR',
		}),
		$NEXT_MINOR_VERSION_PATCH: splitSemVersion({
			...input,
			inc: 'minor',
			template: '$PATCH',
		}),
		$NEXT_PATCH_VERSION: splitSemVersion({ ...input, inc: 'patch' }),
		$NEXT_PATCH_VERSION_MAJOR: splitSemVersion({
			...input,
			inc: 'patch',
			template: '$MAJOR',
		}),
		$NEXT_PATCH_VERSION_MINOR: splitSemVersion({
			...input,
			inc: 'patch',
			template: '$MINOR',
		}),
		$NEXT_PATCH_VERSION_PATCH: splitSemVersion({
			...input,
			inc: 'patch',
			template: '$PATCH',
		}),
		$INPUT_VERSION: splitSemVersion({ ...input, version: input.versionInput }),
		$RESOLVED_VERSION: splitSemVersion({
			...input,
			inc: input.versionKeyIncrement || 'patch',
		}),
	}

	templatableVersion.$RESOLVED_VERSION =
		templatableVersion.$INPUT_VERSION || templatableVersion.$RESOLVED_VERSION

	return templatableVersion
}

function toSemver(version: string): semver.SemVer | undefined {
	const result = semver.parse(version)
	if (result) {
		return result
	}

	// doesn't handle prerelease
	return semver.coerce(version) ?? undefined
}

function coerceVersion(
	input?: string | { tag_name: string; name: string },
	tagPrefix?: string,
): semver.SemVer | undefined {
	if (!input) {
		return
	}

	const stripTag = (input: string) =>
		tagPrefix && input.startsWith(tagPrefix)
			? input.slice(tagPrefix.length)
			: input

	return typeof input === 'object'
		? toSemver(stripTag(input.tag_name)) || toSemver(stripTag(input.name))
		: toSemver(stripTag(input))
}

export function getVersionInfo(
	release: { tag_name: string; name: string },
	template: string,
	versionKeyIncrement?: semver.ReleaseType,
	inputVersion?: string,
	tagPrefix?: string,
) {
	const releaseVersion = coerceVersion(release, tagPrefix)
	const versionInput = coerceVersion(inputVersion, tagPrefix)
	const version =
		!releaseVersion && versionInput ? versionInput : releaseVersion

	if (!version) {
		return defaultVersionInfo
	}

	return {
		...getTemplatableVersion({
			version,
			template,
			versionInput,
			versionKeyIncrement,
		}),
	}
}

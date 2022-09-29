import { getVersionInfo, defaultVersionInfo } from '../src/versions.js'
import { ReleaseType } from 'semver'

function expected(major = '11.0.0', minor = '10.1.0', patch = '10.0.4') {
	return {
		$NEXT_MAJOR_VERSION: {
			version: major,
			template: '$MAJOR.$MINOR.$PATCH',
		},
		$NEXT_MAJOR_VERSION_MAJOR: {
			version: major,
			template: '$MAJOR',
		},
		$NEXT_MAJOR_VERSION_MINOR: {
			version: major,
			template: '$MINOR',
		},
		$NEXT_MAJOR_VERSION_PATCH: {
			version: major,
			template: '$PATCH',
		},
		$NEXT_MINOR_VERSION: {
			version: minor,
			template: '$MAJOR.$MINOR.$PATCH',
		},
		$NEXT_MINOR_VERSION_MAJOR: {
			version: minor,
			template: '$MAJOR',
		},
		$NEXT_MINOR_VERSION_MINOR: {
			version: minor,
			template: '$MINOR',
		},
		$NEXT_MINOR_VERSION_PATCH: {
			version: minor,
			template: '$PATCH',
		},
		$NEXT_PATCH_VERSION: {
			version: patch,
			template: '$MAJOR.$MINOR.$PATCH',
		},
		$NEXT_PATCH_VERSION_MAJOR: {
			version: patch,
			template: '$MAJOR',
		},
		$NEXT_PATCH_VERSION_MINOR: {
			version: patch,
			template: '$MINOR',
		},
		$NEXT_PATCH_VERSION_PATCH: {
			version: patch,
			template: '$PATCH',
		},
	}
}

describe('versions', () => {
	const createdAt = new Date().toISOString()

	it('extracts a version-like string from the last tag', () => {
		const versionInfo = getVersionInfo(
			{
				tag_name: 'v10.0.3',
				name: 'Some release',
				created_at: createdAt,
				target_commitish: 'main',
				id: 1,
				draft: false,
			},
			'$MAJOR.$MINOR.$PATCH',
		)

		expect(versionInfo).toMatchObject(expected())
	})

	it('extracts a version-like string from the last release name if the tag isnt a version', () => {
		const versionInfo = getVersionInfo(
			{
				tag_name: 'notaproperversion',
				name: '10.0.3',
				created_at: createdAt,
				target_commitish: 'main',
				id: 1,
				draft: false,
			},
			'$MAJOR.$MINOR.$PATCH',
		)

		expect(versionInfo).toMatchObject(expected())
	})

	it('preferences tags over release names', () => {
		const versionInfo = getVersionInfo(
			{
				tag_name: '10.0.3',
				name: '8.1.0',
				created_at: createdAt,
				target_commitish: 'main',
				id: 1,
				draft: false,
			},
			'$MAJOR.$MINOR.$PATCH',
		)

		expect(versionInfo).toMatchObject(expected())
	})

	it('handles alpha/beta releases', () => {
		const versionInfo = getVersionInfo(
			{
				tag_name: 'v10.0.3-alpha',
				name: 'Some release',
				created_at: createdAt,
				target_commitish: 'main',
				id: 1,
				draft: false,
			},
			'$MAJOR.$MINOR.$PATCH',
			'v10.0.4-alpha',
		)

		expect(versionInfo).toMatchObject(expected(undefined, undefined, '10.0.3'))
	})

	it('handles stripping of the tag_name', () => {
		const versionInfo = getVersionInfo(
			{
				tag_name: 'v10.0.3-alpha',
				name: 'Some release',
				created_at: createdAt,
				target_commitish: 'main',
				id: 1,
				draft: false,
			},
			'$MAJOR.$MINOR.$PATCH',
			'v10.0.4-alpha',
			undefined,
			'v',
		)

		expect(versionInfo).toEqual(versionInfo)
	})

	it('handles input version over version being empty', () => {
		const versionInfo = getVersionInfo(
			{
				tag_name: '',
				name: '',
				created_at: createdAt,
				target_commitish: 'main',
				id: 1,
				draft: false,
			},
			'$MAJOR.$MINOR.$PATCH',
			'v10.0.4-alpha',
		)

		expect(versionInfo).toEqual(versionInfo)
	})

	it('returns default version info if no version was found in tag or name', () => {
		const versionInfo = getVersionInfo(
			{
				tag_name: '',
				name: '',
				created_at: createdAt,
				target_commitish: 'main',
				id: 1,
				draft: false,
			},
			'',
		)

		expect(versionInfo).toEqual(defaultVersionInfo)
	})

	it.each([
		['patch', '10.0.4'],
		['minor', '10.1.0'],
		['major', '11.0.0'],
	])(
		"when the resolver versionKey increment is '%s'",
		(versionKey: string, expected: string) => {
			const template = ''
			const versionInfo = getVersionInfo(
				{
					tag_name: 'v10.0.3',
					name: 'Some release',
					created_at: createdAt,
					target_commitish: 'main',
					id: 1,
					draft: false,
				},
				template,
				undefined,
				versionKey as ReleaseType,
			)
			expect(versionInfo.$RESOLVED_VERSION?.version).toEqual(expected)
		},
	)
})

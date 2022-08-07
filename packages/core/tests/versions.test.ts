import { describe, it, expect } from '@jest/globals'

import { getVersionInfo, defaultVersionInfo } from '../src/versions.js'
import { ReleaseType } from 'semver'

function expected(
	versionInfo: any,
	major = '11.0.0',
	minor = '10.1.0',
	patch = '10.0.4',
) {
	expect(versionInfo.$NEXT_MAJOR_VERSION?.version).toEqual(major)
	expect(versionInfo.$NEXT_MAJOR_VERSION?.template).toEqual(
		'$MAJOR.$MINOR.$PATCH',
	)
	expect(versionInfo.$NEXT_MAJOR_VERSION_MAJOR?.version).toEqual(major)
	expect(versionInfo.$NEXT_MAJOR_VERSION_MAJOR?.template).toEqual('$MAJOR')
	expect(versionInfo.$NEXT_MAJOR_VERSION_MINOR?.version).toEqual(major)
	expect(versionInfo.$NEXT_MAJOR_VERSION_MINOR?.template).toEqual('$MINOR')
	expect(versionInfo.$NEXT_MAJOR_VERSION_PATCH?.version).toEqual(major)
	expect(versionInfo.$NEXT_MAJOR_VERSION_PATCH?.template).toEqual('$PATCH')
	expect(versionInfo.$NEXT_MINOR_VERSION?.version).toEqual(minor)
	expect(versionInfo.$NEXT_MINOR_VERSION?.template).toEqual(
		'$MAJOR.$MINOR.$PATCH',
	)
	expect(versionInfo.$NEXT_MINOR_VERSION_MAJOR?.version).toEqual(minor)
	expect(versionInfo.$NEXT_MINOR_VERSION_MAJOR?.template).toEqual('$MAJOR')
	expect(versionInfo.$NEXT_MINOR_VERSION_MINOR?.version).toEqual(minor)
	expect(versionInfo.$NEXT_MINOR_VERSION_MINOR?.template).toEqual('$MINOR')
	expect(versionInfo.$NEXT_MINOR_VERSION_PATCH?.version).toEqual(minor)
	expect(versionInfo.$NEXT_MINOR_VERSION_PATCH?.template).toEqual('$PATCH')
	expect(versionInfo.$NEXT_PATCH_VERSION?.version).toEqual(patch)
	expect(versionInfo.$NEXT_PATCH_VERSION?.template).toEqual(
		'$MAJOR.$MINOR.$PATCH',
	)
	expect(versionInfo.$NEXT_PATCH_VERSION_MAJOR?.version).toEqual(patch)
	expect(versionInfo.$NEXT_PATCH_VERSION_MAJOR?.template).toEqual('$MAJOR')
	expect(versionInfo.$NEXT_PATCH_VERSION_MINOR?.version).toEqual(patch)
	expect(versionInfo.$NEXT_PATCH_VERSION_MINOR?.template).toEqual('$MINOR')
	expect(versionInfo.$NEXT_PATCH_VERSION_PATCH?.version).toEqual(patch)
	expect(versionInfo.$NEXT_PATCH_VERSION_PATCH?.template).toEqual('$PATCH')
}

describe('versions', () => {
	const createdAt = new Date().toISOString()

	it('extracts a version-like string from the last tag', () => {
		const versionInfo = getVersionInfo(
			{
				tag_name: 'v10.0.3',
				name: 'Some release',
				created_at: createdAt,
				target_commitish: 'master',
				id: 1,
				draft: false,
			},
			'$MAJOR.$MINOR.$PATCH',
		)

		expected(versionInfo)
	})

	it('extracts a version-like string from the last release name if the tag isnt a version', () => {
		const versionInfo = getVersionInfo(
			{
				tag_name: 'notaproperversion',
				name: '10.0.3',
				created_at: createdAt,
				target_commitish: 'master',
				id: 1,
				draft: false,
			},
			'$MAJOR.$MINOR.$PATCH',
		)

		expected(versionInfo)
	})

	it('preferences tags over release names', () => {
		const versionInfo = getVersionInfo(
			{
				tag_name: '10.0.3',
				name: '8.1.0',
				created_at: createdAt,
				target_commitish: 'master',
				id: 1,
				draft: false,
			},
			'$MAJOR.$MINOR.$PATCH',
		)

		expected(versionInfo)
	})

	it('handles alpha/beta releases', () => {
		const versionInfo = getVersionInfo(
			{
				tag_name: 'v10.0.3-alpha',
				name: 'Some release',
				created_at: createdAt,
				target_commitish: 'master',
				id: 1,
				draft: false,
			},
			'$MAJOR.$MINOR.$PATCH',
			'v10.0.4-alpha',
		)

		expected(versionInfo, undefined, undefined, '10.0.3')
	})

	it('returns default version info if no version was found in tag or name', () => {
		const versionInfo = getVersionInfo(
			{
				tag_name: '',
				name: '',
				created_at: createdAt,
				target_commitish: 'master',
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
					target_commitish: 'master',
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

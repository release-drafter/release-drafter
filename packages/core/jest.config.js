import base from '../../jest.config.base.js'

export default {
	...base,
	displayName: 'Release Drafter Core',
	coveragePathIgnorePatterns: [
		...base.coveragePathIgnorePatterns,
		'<rootDir>/src/enums.ts',
	],
}

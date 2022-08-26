export default {
	preset: 'ts-jest/presets/default-esm',
	verbose: true,
	globals: {
		'ts-jest': {
			useESM: true,
		},
	},
	moduleNameMapper: {
		'^@release-drafter/(.*)$': '<rootDir>/packages/$1/',
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	collectCoverage: true,
	coverageDirectory: 'coverage',
	collectCoverageFrom: ['<rootDir>/packages/*/src/**/*.tsx?'],
	coveragePathIgnorePatterns: ['jest.config.js', '/node_modules/', '/dist/'],
	testEnvironment: 'node',
	transformIgnorePatterns: [],
	roots: ['<rootDir>'],
}

export default {
	preset: 'ts-jest/presets/default-esm',
	verbose: true,
	roots: ['<rootDir>/src', '<rootDir>/tests'],
	globals: {
		'ts-jest': {
			useESM: true,
		},
	},
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	collectCoverage: true,
	collectCoverageFrom: ['<rootDir>/src/**/*.tsx?'],
	testEnvironment: 'node',
	transformIgnorePatterns: [],
	modulePaths: ['<rootDir>/src', '<rootDir>/tests', '<rootDir>'],
}

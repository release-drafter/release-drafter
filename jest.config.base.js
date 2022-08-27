export default {
	preset: 'ts-jest/presets/default-esm',
	testEnvironment: 'node',
	coverageDirectory: 'coverage',
	collectCoverage: true,
	collectCoverageFrom: ['src/**/*.{ts,tsx}'],
	coverageProvider: 'v8',
	globals: {
		'ts-jest': {
			useESM: true,
		},
	},
	moduleNameMapper: {
		'^@release\\-drafter/(.*)$': '<rootDir>/../../packages/$1/src',
		'@jest/globals': '<rootDir>/../../node_modules/@jest/globals',
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
}

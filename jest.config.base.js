export default {
	transform: {
		'^.+\\.(t|j)sx?$': [
			'@swc/jest',
			{
				jsc: {
					target: 'es2022',
				},
			},
		],
	},
	extensionsToTreatAsEsm: ['.ts', '.tsx'],
	testEnvironment: 'node',
	coverageDirectory: 'coverage',
	collectCoverage: true,
	collectCoverageFrom: ['src/**/*.{ts,tsx}'],
	coveragePathIgnorePatterns: [
		'<rootDir>/src/index.ts',
		'<rootDir>/src/types.ts',
	],
	coverageProvider: 'v8',
	moduleNameMapper: {
		'^@release\\-drafter/(.*)$': '<rootDir>/../../packages/$1/src',
		'@jest/globals': '<rootDir>/../../node_modules/@jest/globals',
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
}

export default {
	'**/*.ts': () => `eslint --fix .`,
	'**/*': () => `prettier --write .`,
	'packages/{core/action}/src/*.ts|packages/{core/action}/package.json': () =>
		'pnpm run build --dir packages/action',
}

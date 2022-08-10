import micromatch from 'micromatch'

export default {
	'*': (files) => {
		const typescriptFiles = micromatch(files, ['*.ts'], {})
		const allOther = micromatch.not(files, ['*.ts'])
		const tasks = []
		if (typescriptFiles.length > 0) {
			tasks.push(`eslint --fix ${typescriptFiles.join(' ')}`)
		}
		tasks.push(`prettier --ignore-unknown --write ${allOther.join(' ')}`)
		return tasks
	},
	'packages/{core,action}/src/*.ts|packages/{core,action}/package.json': () =>
		'pnpm --dir packages/action run build',
}

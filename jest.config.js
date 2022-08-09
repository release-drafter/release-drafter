import base from './jest.config.base.js'

export default {
	...base,
	roots: ['<rootDir>'],
	projects: ['<rootDir>/packages/*'],
}

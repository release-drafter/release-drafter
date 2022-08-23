export type Options = {
	repository: string
	reference: string
	defaultBranch: string
	prerelease: boolean
	publish: boolean
	version?: string
	tag?: string
	name?: string
	configName: string
	config?: string
	header?: string
	footer?: string
	commitish?: string
	noFetchConfig: boolean
}

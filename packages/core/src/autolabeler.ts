import { Context } from './context.js'
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods'
import ignore, { Ignore } from 'ignore'

type PrFile = {
	filename: string
	previous_filename?: string
}

export async function autolabeler(context: Context) {
	const config = await context.config()

	const changedFiles = await context.octokit.paginate(
		'GET /repos/{owner}/{repo}/pulls/{pull_number}/files',
		{
			owner: context.owner,
			repo: context.repo,
			pull_number: context.pullRequest,
			per_page: 100,
		},
		(response) => response.data.map((fileData) => fileData.filename),
	)

	// const labels = new Set()
	//
	// for (const autolabel of config.autolabeler) {
	// 	let found = false
	// 	// check modified files
	// 	if (!found && autolabel.files.length > 0) {
	// 		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// 		// @ts-ignore
	// 		const ig: Ignore = new ignore()
	// 		const matcher = ig.add(autolabel.files)
	// 		if (changedFiles.some((file) => matcher.ignores(file))) {
	// 			labels.add(autolabel.label)
	// 		}
	// 	}
	// 	// check branch names
	// 	if (!found && autolabel.branch.length > 0) {
	// 		for (const matcher of autolabel.branch) {
	// 			if (matcher.test(context.payload.pull_request.head.ref)) {
	// 				labels.add(autolabel.label)
	// 				found = true
	// 				break
	// 			}
	// 		}
	// 	}
	// 	// check pr title
	// 	if (!found && autolabel.title.length > 0) {
	// 		for (const matcher of autolabel.title) {
	// 			if (matcher.test(context.payload.pull_request.title)) {
	// 				labels.add(autolabel.label)
	// 				found = true
	// 				break
	// 			}
	// 		}
	// 	}
	// 	// check pr body
	// 	if (
	// 		!found &&
	// 		context.payload.pull_request.body != undefined &&
	// 		autolabel.body.length > 0
	// 	) {
	// 		for (const matcher of autolabel.body) {
	// 			if (matcher.test(context.payload.pull_request.body)) {
	// 				labels.add(autolabel.label)
	// 				found = true
	// 				break
	// 			}
	// 		}
	// 	}
	// }
	//
	// const labelsToAdd = [...labels]
	// if (labelsToAdd.length > 0) {
	// 	const labelIssue = {
	// 		...context.issue({
	// 			issue_number: context.payload.pull_request.number,
	// 			labels: labelsToAdd,
	// 		}),
	// 	}
	// 	await context.octokit.issues.addLabels(labelIssue)
	// 	return
	// }
}

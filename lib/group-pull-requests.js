const compareVersions = require("compare-versions");

const groupPullRequests = (pullRequests) => {

    const dependabotPRs = {}
    const otherPRs = []

    const bumpVersionRegExp = new RegExp("Bump ([^\S]+) from ([^\S]+) to ([^\S]+)", "g");

    // group all matching dependabot PRs
    for (let i in pullRequests) {
        const currentPR = pullRequests[i]

        if (currentPR.title.match(bumpVersionRegExp)) {
            const match = [...pullRequests[i].title.matchAll(bumpVersionRegExp)][0]

            const artifact = match[1]
            const fromVersion = match[2]
            const toVersion = match[3]

            if (dependabotPRs[artifact]) {
                const prevDependabotPR = dependabotPRs[artifact]
                dependabotPRs[artifact] = {
                    from: (compareVersions(fromVersion, prevDependabotPR.from) < 0) ? fromVersion : prevDependabotPR.from,
                    to: (compareVersions(toVersion, prevDependabotPR.to) > 0) ? toVersion : prevDependabotPR.to,
                    pullRequests: [...prevDependabotPR.pullRequests, currentPR.number],
                    // use the latest PR for creating the final changelog entry
                    pr: (compareVersions(toVersion, prevDependabotPR.to) > 0) ? currentPR : prevDependabotPR.pr
                }
            } else {
                dependabotPRs[artifact] = {
                    from: fromVersion,
                    to: toVersion,
                    pullRequests: [currentPR.number],
                    pr: currentPR
                }
            }
        } else {
            otherPRs.push(currentPR)
        }
    }

    // reconstruct all PRs
    const result = [...otherPRs]
    for (const [key, value] of Object.entries(dependabotPRs)) {
        const pr = value.pr
        pr.title = `Bump ${key} from ${value.from} to ${value.to}`
        pr.number = value.pullRequests
        result.push(pr)
    }
    return result
}

exports.groupPullRequests = groupPullRequests

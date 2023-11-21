const compareVersions = require("compare-versions");

const groupPullRequests = (pullRequests) => {

    const dependabotPRs = {}
    const otherPRs = []

    const dependabot = new RegExp("Bump ([^\S]+) from ([^\S]+) to ([^\S]+)", "gm");
    for (let i in pullRequests) {
        const currentPullRequest = pullRequests[i]

        if (currentPullRequest.title.match(dependabot)) {
            const matches = [...pullRequests[i].title.matchAll(dependabot)]
            if (dependabotPRs[matches[0][1]]) {
                const curr = dependabotPRs[matches[0][1]]
                const from = (compareVersions(matches[0][2], curr.from) < 0) ? matches[0][2] : curr.from
                const to = (compareVersions(matches[0][3], curr.to) > 0) ? matches[0][3] : curr.to
                curr.number.push(currentPullRequest.number)
                dependabotPRs[matches[0][1]] = {
                    from: from,
                    to: to,
                    number: curr.number,
                    pr: currentPullRequest
                }
            } else {
                dependabotPRs[matches[0][1]] = {
                    from: matches[0][2],
                    to: matches[0][3],
                    number: [currentPullRequest.number],
                    pr: currentPullRequest
                }
            }
        } else {
            otherPRs.push(currentPullRequest)
        }
    }

    const result = [...otherPRs]

    for (const [key, value] of Object.entries(dependabotPRs)) {
        const item = value.pr
        item.title = `Bump ${key} from ${value.from} to ${value.to}`
        item.number = value.number
        result.push(item)
    }
    console.log(result)

    return result
}

exports.groupPullRequests = groupPullRequests

const semverRegex = /(\d+)\.(\d+)\.(\d+)/;

module.exports.getVersionInfo = (lastRelease) => {
    const lastReleaseTag = lastRelease.tag_name;
    const lastReleaseName = lastRelease.name;

    let lastReleaseMatch;
    lastReleaseMatch = lastReleaseTag.match(semverRegex);
    if (! lastReleaseMatch) {
        lastReleaseMatch = lastReleaseName.match(semverRegex);
    }

    if (! lastReleaseMatch) {
        return undefined;
    }

    const major = (lastReleaseMatch[1] - 0);
    const minor = (lastReleaseMatch[2] - 0);
    const patch = (lastReleaseMatch[3] - 0);

    return {
        incrementedMajor: `${major + 1}.0.0`,
        incrementedMinor: `${major}.${minor + 1}.0`,
        incrementedPatch: `${major}.${minor}.${patch + 1}`,
    }
}
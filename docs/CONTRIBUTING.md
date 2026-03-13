# Contributing

[fork]: https://github.com/release-drafter/release-drafter/fork
[pr]: https://github.com/release-drafter/release-drafter/compare
[style]: https://standardjs.com/
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! We are thrilled that you'd like to contribute to this project. Your
help is essential for keeping it great.

Please note that this project is released with a [Contributor Code of
Conduct][code-of-conduct]. By participating in this project you agree to abide
by its terms.

## Submitting a pull request

1. [Fork][fork] and clone the repository
2. Configure and install the dependencies: `npm install`
3. Create a new branch: `git checkout -b my-branch-name`
4. Make your change, add tests, and run `npm run all` before pushing — this runs
   formatting, linting, type checking, tests, and builds the `dist/` directory.
   The CI pipeline enforces that the repository has no uncommitted changes after
   these steps, so **you must run `npm run all` locally before pushing** to
   avoid build failures.
5. Push to your fork and [submit a pull request][pr]
6. Give yourself a high five, and wait for your pull request to be reviewed and
   merged.

Here are a few things you can do that will increase the likelihood of your pull
request being accepted:

- Follow the [style guide][style] which is using standard. Any linting errors
  should be shown when running `npm run all`
- Write and update tests.
- Keep your change as focused as possible. If there are multiple changes you
  would like to make that are not dependent upon each other, consider submitting
  them as separate pull requests.
- Write a
  [convetional commit message](https://www.conventionalcommits.org/en/v1.0.0/).

Work in Progress pull requests are also welcome to get feedback early on, or if
there is something blocked you.

## Issue Management Policy

To maintain project health and keep issues actionable, we automatically manage
stale issues using the following policy:

**Stale Issue Closure**: Issues labeled with `info-needed` that remain inactive
for 30 days will be automatically marked as stale. After an additional 7-day
grace period, the issue will be closed if no response is provided.

When an issue is marked as stale, we'll post a comment asking you to provide the
requested information. If you respond with the information or show continued
interest, the stale label will be removed and the issue will remain open.

This policy helps us:

- Keep the issue tracker focused on active issues
- Encourage timely responses to information requests
- Ensure discussions don't get lost in an ever-growing issue backlog

If your issue was closed due to inactivity but you still have relevant
information or context, please feel free to reopen it by commenting on the issue
or opening a new one.

## Releasing

Run the following command:

```bash
git checkout master
git pull
npm version [major | minor | patch] -m "chore: release v%s"
```

> [!IMPORTANT]
>
> You may want the version increment to correspond to the last drafted release.
> You can use a version number instead of `major | minor | patch` if needed.

The command does the following:

- Run tests (`preversion` script)
- Bumps the version number in [package.json](../package.json) and create
  corresponding tag
- Stage changes for git (`version` script)
- Commit and tag
- Push & push tag (`postversion` script)

After pushing, the `release.yml` workflow will trigger (`on: push: tag`), and :

- publish the release draft
- update major tag (ex: pushing `v6.2.1` bumps `v6` to the same commit)

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)

# @release-drafter/gh-actions

This private workspace package contains shared GitHub Actions runtime code. The
package is not published.

The Drafter, Autolabeler, and Check PR actions have separate source entrypoints,
package exports, and root `dist/actions/*/run.js` bundles. This package contains
their shared GitHub Actions Toolkit integration, configuration loader, GitHub
adapter setup, GitHub Enterprise Server support, and proxy configuration.

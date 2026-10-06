import { pathToFileURL } from 'node:url'

// GitLab CE with Omnibus configuration and this suite's project already applied,
// built by https://github.com/jetersen/gitlab-ce-warm from seeds/release-drafter.sh.
// The conformance workflow runs this file to start the pull before npm ci.
export const GITLAB_IMAGE =
  'ghcr.io/jetersen/gitlab-ce-warm:19.1.3-ce.0-release-drafter@sha256:b6f7d46b399afbdd28e9f4addb2c537a4fa46d538d2fb33ec5158d0de3d2b363'

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  console.log(GITLAB_IMAGE)
}

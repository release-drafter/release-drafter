/** Pinned conformance images. Renovate updates the tags and digests. */
export const FORGE_IMAGES = {
  // Gitea's official GHCR copy of the Docker Hub image, with the same digest.
  gitea:
    'ghcr.io/go-gitea/gitea:1.27.1@sha256:34e3f6b75f5cbb6aebce588037fc5a53c84213e4d4b00da0a8d73e031a558e52',
  // An unchanged mirror of data.forgejo.org/forgejo/forgejo, with the same
  // digest, maintained by https://github.com/jetersen/gitlab-ce-warm. Runners
  // pull it several times faster than the upstream registry.
  forgejo:
    'ghcr.io/jetersen/forgejo:16.0.2@sha256:2fdfe28b5c68f82f49580e227b84e2afb43af0250e0631a54a386ef3b1d9b759',
  // GitLab CE with Omnibus configuration and this suite's project already
  // applied, built by https://github.com/jetersen/gitlab-ce-warm from
  // seeds/release-drafter.sh.
  gitlab:
    'ghcr.io/jetersen/gitlab-ce-warm:19.1.3-ce.0-release-drafter@sha256:772027d7c3def1507c4897bf9cfc17fc6968e0e89b555da5058e000b96631f72',
} as const

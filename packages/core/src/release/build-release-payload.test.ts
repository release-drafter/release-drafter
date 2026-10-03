import { describe, expect, it } from 'vitest'
import {
  type Config,
  configSchema,
  mergeInputAndConfig,
} from '../config/index.ts'
import { noopLogger } from '../ports.ts'
import type { PullRequest, Release, ReleaseInput } from '../types.ts'
import { buildReleasePayload } from './build-release-payload.ts'

const buildPayload = (
  params: {
    config?: Partial<Config>
    input?: Partial<ReleaseInput>
    lastRelease?: Release
    pullRequests?: PullRequest[]
  } = {},
) => {
  const options = {
    lastRelease: { id: 1, tagName: 'v1.2.3' },
    pullRequests: [] as PullRequest[],
    ...params,
  }
  const input = { publish: false, ...params.input }
  return buildReleasePayload({
    adapter: {
      resolveCommitish: async ({ commitish }) => commitish,
    },
    commits: [],
    config: mergeInputAndConfig({
      config: configSchema.parse({
        commitish: 'main',
        template:
          'compare/$PREVIOUS_TAG...$RESOLVED_TAG; version=$RESOLVED_VERSION',
        'tag-template': '$RESOLVED_VERSION',
        ...params.config,
      }),
      input: {},
      logger: noopLogger,
    }),
    input,
    lastRelease: options.lastRelease,
    logger: noopLogger,
    pullRequests: options.pullRequests,
    repository: {
      owner: 'example',
      name: 'repo',
      serverUrl: 'https://github.com',
    },
  })
}

describe('resolved tag in release bodies', () => {
  it.each([undefined, 'global'] as const)(
    'applies body replacers before escaping and final replacers with target %j',
    async (target) => {
      const payload = await buildPayload({
        config: {
          header: '<!-- header -->\n',
          template: '<!-- template -->\n$CHANGES',
          footer: '\n<!-- footer -->',
          'change-template': '$TITLE: $BODY',
          'change-body-escapes': '<@',
          replacers: [
            { target, search: 'Visible', replace: 'Final' },
            {
              target: 'change-body',
              search: '/<!--.*?-->/gs',
              replace: '',
            },
            { target: 'change-body', search: 'source', replace: 'Visible' },
          ],
        },
        pullRequests: [
          {
            number: 1,
            title: '<!-- title --> Visible',
            body: '<!-- instructions\nremove me -->source <b>@user</b>',
          },
        ],
      })

      expect(payload.body).toBe(
        '<!-- header -->\n<!-- template -->\n<!-- title --> Final: Final \\<b>@<!---->user\\</b>\n<!-- footer -->',
      )
    },
  )

  it.each([
    {
      description: 'ordinary version tag',
      config: {},
      input: {},
      tag: '1.2.4',
      version: '1.2.4',
    },
    {
      description: 'v-prefixed tag',
      config: { 'tag-template': 'v$RESOLVED_VERSION' },
      input: {},
      tag: 'v1.2.4',
      version: '1.2.4',
    },
    {
      description: 'configured prefix',
      config: {
        'tag-prefix': 'foobar_v',
        'tag-template': 'foobar_v$RESOLVED_VERSION',
      },
      input: {},
      tag: 'foobar_v1.2.4',
      version: '1.2.4',
    },
    {
      description: 'tag template without tag-prefix',
      config: { 'tag-template': 'release-$RESOLVED_VERSION' },
      input: {},
      tag: 'release-1.2.4',
      version: '1.2.4',
    },
    {
      description: 'tag using a different next version',
      config: { 'tag-template': 'v$NEXT_MAJOR_VERSION' },
      input: {},
      tag: 'v2.0.0',
      version: '1.2.4',
    },
    {
      description: 'literal input tag override',
      config: { 'tag-template': 'configured-$RESOLVED_VERSION' },
      input: { tag: 'v2.4.0' },
      tag: 'v2.4.0',
      version: '2.4.0',
    },
    {
      description: 'templated input tag override',
      config: { 'tag-template': 'configured-$RESOLVED_VERSION' },
      input: { version: '2.4.0', tag: 'input-v$RESOLVED_VERSION-RC1' },
      tag: 'input-v2.4.0-RC1',
      version: '2.4.0',
    },
    {
      description: 'non-version input tag',
      config: {},
      input: { tag: 'stable' },
      tag: 'stable',
      version: '1.2.4',
    },
    {
      description: 'empty input tag override',
      config: { 'tag-template': 'v$RESOLVED_VERSION' },
      input: { tag: '' },
      tag: '',
      version: '1.2.4',
    },
    {
      description: 'missing tag template',
      config: { 'tag-template': undefined },
      input: {},
      tag: '',
      version: '1.2.4',
    },
  ])(
    'uses the final tag for $description',
    async ({ config, input, tag, version }) => {
      const payload = await buildPayload({ config, input })

      expect(payload.tag).toBe(tag)
      expect(payload.resolvedVersion).toBe(version)
      expect(payload.body).toBe(`compare/v1.2.3...${tag}; version=${version}`)
    },
  )

  it('expands tags and version component helpers in headers, templates, and footers', async () => {
    const payload = await buildPayload({
      config: {
        header: 'header=$RESOLVED_TAG ($RESOLVED_VERSION_MAJOR)\n',
        template:
          '$OWNER/$REPOSITORY: $RESOLVED_TAG ($RESOLVED_VERSION_MINOR)\n',
        footer: 'footer=$RESOLVED_TAG ($RESOLVED_VERSION_PATCH)',
        'tag-template':
          'v$RESOLVED_VERSION_MAJOR.$RESOLVED_VERSION_MINOR.$RESOLVED_VERSION_PATCH',
      },
    })

    expect(payload.body).toBe(
      'header=v1.2.4 (1)\nexample/repo: v1.2.4 (2)\nfooter=v1.2.4 (4)',
    )
    expect(payload.tag).toBe('v1.2.4')
  })

  it('expands tags introduced by changelog templates and replacers in the final pass', async () => {
    const payload = await buildPayload({
      config: {
        template: '$CHANGES\nCOMPARE_LINK',
        'change-template': '- $TITLE for $RESOLVED_TAG ($RESOLVED_VERSION)',
        'tag-template': 'release-$RESOLVED_VERSION',
        replacers: [
          {
            search: 'COMPARE_LINK',
            replace: 'tag=$RESOLVED_TAG; version=$RESOLVED_VERSION',
          },
          { search: 'release-', replace: 'changed-' },
        ],
      },
      pullRequests: [{ number: 1, title: 'Fix bug' }],
    })

    expect(payload.body).toBe(
      '- Fix bug for release-1.2.4 (1.2.4)\ntag=release-1.2.4; version=1.2.4',
    )
    expect(payload.tag).toBe('release-1.2.4')
  })

  it('preserves custom version formatting when rendering a prefixed prerelease tag', async () => {
    const payload = await buildPayload({
      lastRelease: { id: 1, tagName: 'foobar_v1.2.3-rc.2' },
      config: {
        'tag-prefix': 'foobar_v',
        'tag-template': 'foobar_v$RESOLVED_VERSION',
        'version-template': '$MAJOR.$MINOR.$PATCH$PRERELEASE+build',
        prerelease: true,
        'prerelease-identifier': 'rc',
      },
    })

    expect(payload.tag).toBe('foobar_v1.2.3-rc.3+build')
    expect(payload.resolvedVersion).toBe('1.2.3-rc.3+build')
    expect(payload.body).toBe(
      'compare/foobar_v1.2.3-rc.2...foobar_v1.2.3-rc.3+build; version=1.2.3-rc.3+build',
    )
  })

  it('expands the first release tag alongside the no-previous-release notice', async () => {
    const payload = await buildPayload({ lastRelease: undefined })

    expect(payload.tag).toBe('0.0.1')
    expect(payload.body).toContain('compare/...0.0.1; version=0.0.1')
    expect(payload.body).not.toContain('$RESOLVED_TAG')
    expect(payload.body).not.toContain('$OWNER')
  })
})

import { describe, expect, it, vi } from 'vitest'
import {
  commonConfigSchema,
  configSchema,
  mergeInputAndConfig,
} from '../config/index.ts'
import type { Logger } from '../ports.ts'
import type { PullRequest } from '../types.ts'
import { generateChangeLog } from './generate-changelog.ts'

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
} satisfies Logger

const parsedConfig = (config: Record<string, unknown>) =>
  mergeInputAndConfig({
    config: configSchema.parse({
      template: '$CHANGES',
      commitish: 'refs/heads/main',
      ...config,
    }),
    input: commonConfigSchema.parse({}),
    logger,
  })

const bumpRule = {
  pattern: '/^Bump (?<group>.+?) from (?<from>\\S+) to (?<to>\\S+)$/',
  'title-template': 'Bump $GROUP from $FIRST_FROM to $LAST_TO',
}

const pullRequest = (
  number: number,
  title: string,
  labels: string[] = [],
): PullRequest => ({
  number,
  title,
  labels,
  author: {
    login: 'dependabot',
    type: 'Bot',
    url: 'https://github.com/apps/dependabot',
  },
  mergedAt: `2025-09-01T00:00:00.${String(number).padStart(4, '0')}Z`,
})

const bumps = [
  pullRequest(308, 'Bump njord.version from 0.9.1 to 0.9.2', ['deps']),
  pullRequest(
    309,
    'Bump org.codehaus.mojo:versions-maven-plugin from 2.20.1 to 2.21.0',
    ['deps'],
  ),
  pullRequest(310, 'Bump njord.version from 0.9.2 to 0.9.3', ['deps']),
  pullRequest(316, 'Bump njord.version from 0.9.3 to 0.9.5', ['deps']),
]

const changelog = (config: Record<string, unknown>, pullRequests = bumps) =>
  generateChangeLog({
    logger,
    pullRequests,
    serverUrl: 'https://github.com',
    config: parsedConfig(config),
  })

describe('generateChangeLog', () => {
  it('renders one entry per pull request without grouping rules', () => {
    expect(
      changelog({ 'change-template': '* $TITLE ($NUMBERS)' }),
    ).toMatchInlineSnapshot(`
      "* Bump njord.version from 0.9.1 to 0.9.2 (#308)
      * Bump org.codehaus.mojo:versions-maven-plugin from 2.20.1 to 2.21.0 (#309)
      * Bump njord.version from 0.9.2 to 0.9.3 (#310)
      * Bump njord.version from 0.9.3 to 0.9.5 (#316)"
    `)
  })

  it('merges changes of the same group into a single entry', () => {
    expect(
      changelog({
        'change-template': '* $TITLE ($NUMBERS)',
        'group-changes': [bumpRule],
      }),
    ).toMatchInlineSnapshot(`
      "* Bump org.codehaus.mojo:versions-maven-plugin from 2.20.1 to 2.21.0 (#309)
      * Bump njord.version from 0.9.1 to 0.9.5 (#308, #310, #316)"
    `)
  })

  it('groups within every category separately', () => {
    expect(
      changelog({
        'change-template': '* $TITLE ($NUMBERS)',
        'group-changes': [bumpRule],
        categories: [
          { title: 'Dependencies', labels: ['deps'] },
          { title: 'Maven', labels: ['deps'] },
        ],
      }),
    ).toMatchInlineSnapshot(`
      "## Dependencies

      * Bump org.codehaus.mojo:versions-maven-plugin from 2.20.1 to 2.21.0 (#309)
      * Bump njord.version from 0.9.1 to 0.9.5 (#308, #310, #316)

      ## Maven

      * Bump org.codehaus.mojo:versions-maven-plugin from 2.20.1 to 2.21.0 (#309)
      * Bump njord.version from 0.9.1 to 0.9.5 (#308, #310, #316)"
    `)
  })

  it('collapses a category by the number of rendered entries', () => {
    expect(
      changelog({
        'change-template': '* $TITLE ($NUMBERS)',
        'group-changes': [bumpRule],
        categories: [
          { title: 'Dependencies', labels: ['deps'], 'collapse-after': 1 },
        ],
      }),
    ).toMatchInlineSnapshot(`
      "## Dependencies

      <details>
      <summary>2 changes</summary>

      * Bump org.codehaus.mojo:versions-maven-plugin from 2.20.1 to 2.21.0 (#309)
      * Bump njord.version from 0.9.1 to 0.9.5 (#308, #310, #316)
      </details>"
    `)
  })

  it('does not collapse a category whose changes merge below the threshold', () => {
    expect(
      changelog({
        'change-template': '* $TITLE ($NUMBERS)',
        'group-changes': [bumpRule],
        categories: [
          { title: 'Dependencies', labels: ['deps'], 'collapse-after': 2 },
        ],
      }),
    ).toMatchInlineSnapshot(`
      "## Dependencies

      * Bump org.codehaus.mojo:versions-maven-plugin from 2.20.1 to 2.21.0 (#309)
      * Bump njord.version from 0.9.1 to 0.9.5 (#308, #310, #316)"
    `)
  })
})

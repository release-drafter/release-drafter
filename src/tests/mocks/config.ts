import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { composeConfigGet } from 'src/common/config'
import { parse } from 'yaml'
import { mocks } from '.'

export type AvailableConfigs =
  | 'config-autolabeler'
  | 'config-name-input'
  | 'config-non-master-branch'
  | 'config-previous-tag'
  | 'config-tag-reference'
  | 'config-with-categories-2'
  | 'config-with-categories-3'
  | 'config-with-categories-4'
  | 'config-with-categories-with-collapse-after'
  | 'config-with-categories-with-other-category'
  | 'config-with-categories'
  | 'config-with-changes-templates-and-body'
  | 'config-with-changes-templates-and-url'
  | 'config-with-changes-templates'
  | 'config-with-commitish'
  | 'config-with-commits-since'
  | 'config-with-compare-link'
  | 'config-with-component-helpers-custom'
  | 'config-with-component-helpers-default'
  | 'config-with-component-helpers-major'
  | 'config-with-component-helpers-major-minor'
  | 'config-with-component-helpers-prerelease'
  | 'config-with-component-helpers-prerelease-identifier'
  | 'config-with-contributors'
  | 'config-with-custom-version-resolver-major'
  | 'config-with-custom-version-resolver-minor'
  | 'config-with-custom-version-resolver-none'
  | 'config-with-custom-version-resolver-partial'
  | 'config-with-custom-version-resolver-patch'
  | 'config-with-exclude-contributors'
  | 'config-with-exclude-labels'
  | 'config-with-exclude-paths'
  | 'config-with-footer-template'
  | 'config-with-header-and-footer-no-nl-no-space-template'
  | 'config-with-header-and-footer-template'
  | 'config-with-header-template'
  | 'config-with-history-limit'
  | 'config-with-include-labels'
  | 'config-with-include-paths'
  | 'config-with-include-exclude-paths'
  | 'config-with-include-pre-releases-true'
  | 'config-with-include-pre-releases-false'
  | 'config-with-input-version-template'
  | 'config-with-major-minor-patch-version-template'
  | 'config-with-major-minor-version-template'
  | 'config-with-major-version-template'
  | 'config-with-name-and-tag-template'
  | 'config-with-next-versioning'
  | 'config-without-prerelease'
  | 'config-with-pre-release-identifier'
  | 'config-with-prerelease'
  | 'config-with-pull-request-limit'
  | 'config-with-replacers'
  | 'config-with-resolved-version-template'
  | 'config-with-schema-error'
  | 'config-with-sort-by-title'
  | 'config-with-sort-direction-ascending'
  | 'config-with-tag-prefix'
  | 'config-with-yaml-exception'
  | 'config'

export const mockedConfigModule = async (
  iom: () => Promise<{ composeConfigGet: typeof composeConfigGet }>,
) => {
  const om = await iom()

  const mockedComposeConfigGet: typeof composeConfigGet = async () => {
    const mockedConfig = mocks.config()
    if (mockedConfig) {
      const p = path.resolve(
        import.meta.dirname,
        '../fixtures',
        'config',
        `${mockedConfig}.yml`,
      )
      return {
        config: parse(readFileSync(p, 'utf-8')),
        contexts: mocks.getContextsConfigWasFetchedFrom(),
      }
    } else {
      // will throw inside test-suites
      throw new Error(
        "composeGonfigGet was called without an associated mocked config. Please use mocks.config.mockReturnValue('config')",
      )
    }
  }

  return {
    ...om,
    composeConfigGet: mockedComposeConfigGet,
  }
}

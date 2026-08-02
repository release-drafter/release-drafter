import * as core from '@actions/core'
import {
  type CategoryConfig,
  type Config,
  parseCategories as parseCoreCategories,
} from '@release-drafter/core'

export const parseCategories = (
  categories: { categories: CategoryConfig[] },
  deprecatedConfig: Pick<
    Config,
    | 'exclude-labels'
    | 'include-labels'
    | 'include-paths'
    | 'exclude-paths'
    | 'version-resolver'
  >,
) => parseCoreCategories(categories, deprecatedConfig, core)

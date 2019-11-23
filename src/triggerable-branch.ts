import _ from 'lodash'
import log from './log'
import { DefaultParams, Config } from './types'

interface Params extends DefaultParams {
  branch: string
  config: Config
}

export function isTriggerableBranch({ app, context, branch, config }: Params) {
  const validBranches = _.flatten([config.branches])
  const relevant = config.branches.indexOf(branch) !== -1
  if (!relevant) {
    log({
      app,
      context,
      message: `Ignoring push. ${branch} is not one of: ${validBranches.join(
        ', '
      )}`
    })
  }
  return relevant
}

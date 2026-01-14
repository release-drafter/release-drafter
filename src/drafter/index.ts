import { Config, ActionInput } from '../types/index.js'

export const drafter = async (params: {
  config: Config
  input: ActionInput
}) => {
  /**
   * TODO :
   *
   * 1. find previous releases - returns latest release
   * 2. find commits since latest release, with their associated pull-requests
   * 3. sort those pull-requests according to the desired config (for release-body)
   * 4. generate release info
   * 5. create a release (may be a draft) or update previous draft
   * 6. set action outputs
   */
}

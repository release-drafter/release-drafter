import { ActionInput, Config } from 'src/types'

export const main = async (params: { config: Config; input: ActionInput }) => {
  /**
   * TODO :
   *
   * 1. [new] check event is 'pull_request' - was handled by probot using app.on()
   * 2. get PR's details. I think @actions/github's context is fine
   * 3. find changed files. @actions/github's octokit instance may be useful
   * 4. create Set() of labels to add based on config's autolabeler params
   * 5. add labels. @actions/github's octokit instance may be useful
   */
  console.log('Autolabeler action main logic goes here')
}

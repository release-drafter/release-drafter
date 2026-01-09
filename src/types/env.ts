/**
 * Type-safe shape for the environment variables defined in `.env.example`.
 * All values are strings exposed by the GitHub Actions runtime.
 *
 * @note AI Generated, prone to errors
 */
export interface GithubActionEnvironment extends Record<string, string> {
  /**
   * Always set to `true` in GitHub Actions to indicate a CI environment.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  CI: string

  /**
   * Identifier for the currently executing action.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_ACTION: string

  /**
   * Filesystem path to the action being executed.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_ACTION_PATH: string

  /**
   * `owner/repo` of the action being executed.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_ACTION_REPOSITORY: string

  /**
   * Set to `true` when the workflow runs on GitHub Actions.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_ACTIONS: string

  /**
   * Username of the actor that triggered the workflow.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_ACTOR: string

  /**
   * Numeric ID of the actor that triggered the workflow.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_ACTOR_ID: string

  /**
   * Base URL for the GitHub REST API.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_API_URL: string

  /**
   * Base branch or tag ref for the event, such as the target branch of a pull
   * request.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_BASE_REF: string

  /**
   * Path to the file where environment variables for subsequent steps can be
   * written.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_ENV: string

  /**
   * Name of the event that triggered the workflow run.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_EVENT_NAME: string

  /**
   * Path to the file containing the complete webhook event payload.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_EVENT_PATH: string

  /**
   * Base URL for the GitHub GraphQL API.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_GRAPHQL_URL: string

  /**
   * Head branch or tag ref for the event, such as the source branch of a pull
   * request.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_HEAD_REF: string

  /**
   * Job ID as defined in the workflow.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_JOB: string

  /**
   * Path to the file where step outputs should be written for subsequent steps
   * to read.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_OUTPUT: string

  /**
   * Path to the file that can be populated with directories to prepend to the
   * system `PATH`.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_PATH: string

  /**
   * Full Git ref that triggered the workflow, such as `refs/heads/main` or
   * `refs/tags/v1.0.0`.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_REF: string

  /**
   * Short ref name that triggered the workflow, such as `main` or `v1.0.0`.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_REF_NAME: string

  /**
   * Indicates whether the ref that triggered the workflow is protected.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_REF_PROTECTED: string

  /**
   * Type of ref that triggered the workflow, either `branch` or `tag`.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_REF_TYPE: string

  /**
   * `owner/repo` of the repository that triggered the workflow.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_REPOSITORY: string

  /**
   * Numeric repository ID of the repository that triggered the workflow.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_REPOSITORY_ID: string

  /**
   * Repository owner's name of the repository that triggered the workflow.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_REPOSITORY_OWNER: string

  /**
   * Numeric repository owner ID of the repository that triggered the workflow.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_REPOSITORY_OWNER_ID: string

  /**
   * Retention period (in days) for artifacts and logs generated by the
   * workflow run.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_RETENTION_DAYS: string

  /**
   * Number that increments with each attempt of a given workflow run.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_RUN_ATTEMPT: string

  /**
   * Unique identifier for the current workflow run.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_RUN_ID: string

  /**
   * Run number for the workflow, unique per workflow definition.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_RUN_NUMBER: string

  /**
   * Base URL for the GitHub server instance (for example `https://github.com`).
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_SERVER_URL: string

  /**
   * Commit SHA that triggered the workflow run.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_SHA: string

  /**
   * Path to the file where step summaries can be written in Markdown.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_STEP_SUMMARY: string

  /**
   * Actor that initiated the original workflow run (useful for re-runs).
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_TRIGGERING_ACTOR: string

  /**
   * Name of the workflow as defined in the workflow file.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_WORKFLOW: string

  /**
   * Fully qualified reference to the workflow file path and ref that was used
   * to run the workflow.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_WORKFLOW_REF: string

  /**
   * Commit SHA of the workflow file that is being executed.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_WORKFLOW_SHA: string

  /**
   * Filesystem path to the GitHub workspace directory on the runner.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  GITHUB_WORKSPACE: string

  /**
   * Processor architecture of the runner executing the job.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  RUNNER_ARCH: string

  /**
   * Indicates whether runner diagnostic logging is enabled.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  RUNNER_DEBUG: string

  /**
   * Name of the runner executing the job.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  RUNNER_NAME: string

  /**
   * Operating system of the runner executing the job.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  RUNNER_OS: string

  /**
   * Directory path on the runner for temporary files.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  RUNNER_TEMP: string

  /**
   * Directory on the runner that stores cached tool installations.
   * @see https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
   */
  RUNNER_TOOL_CACHE: string
}

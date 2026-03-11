import { boolean, object, string, stringbool } from 'zod'

/**
 * Inputs shared by release-drafter and autolabeler
 */
export const sharedInputSchema = object({
  /**
   * Access token used to make requests against the GitHub API.
   *
   * Defaults to ${{ github.token }}, or the GITHUB_TOKEN environment variable.
   */
  token: string()
    .min(1)
    .default(() => process.env.GITHUB_TOKEN || ''), // use a function to defer evaluation until parse time
  /**
   * When enabled, no write operations (creating/updating releases or adding
   * labels) are performed. Instead, the action logs what it would have done.
   */
  'dry-run': stringbool().or(boolean()).optional()
}).superRefine((data, ctx) => {
  // Inject token into environment variable for use by octokit
  if (data.token && !process.env.GITHUB_TOKEN) {
    process.env.GITHUB_TOKEN = data.token
  }

  if (!process.env.GITHUB_TOKEN) {
    ctx.addIssue({
      code: 'custom',
      message: "Unable to find a token. Please see input 'token'.",
      path: ['token']
    })
  }
})

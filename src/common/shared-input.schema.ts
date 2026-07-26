import process from 'node:process'
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
  token: string().default(() => process.env.GITHUB_TOKEN || ''), // use a function to defer evaluation until parse time
  /**
   * When enabled, no write operations (creating/updating releases or adding
   * labels) are performed. Instead, the action logs what it would have done.
   */
  'dry-run': stringbool().or(boolean()).optional(),
}).superRefine((data, ctx) => {
  // The token is passed explicitly to `getOctokit`, so it must never be written
  // back into `process.env`: parsing happens inside the library entrypoint too,
  // where leaking a caller's token into the ambient environment (and into every
  // child process spawned afterwards) would be an unwanted side effect.
  if (!data.token) {
    ctx.addIssue({
      code: 'custom',
      message: "Unable to find a token. Please see input 'token'.",
      path: ['token'],
    })
  }
})

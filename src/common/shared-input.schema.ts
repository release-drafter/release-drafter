import process from 'node:process'
import { boolean, object, string, stringbool } from 'zod'

/**
 * Inputs shared by release-drafter and autolabeler
 *
 * A token is not required here. It is validated where a client is actually built
 * (`getOctokit` / `getActionOctokit`), so that a library caller injecting its own
 * `octokit` does not have to supply a token it will never use. The token is also
 * never written back into `process.env`: parsing happens inside the library
 * entrypoint too, where leaking a caller's token into the ambient environment
 * (and into every child process spawned afterwards) would be a side effect.
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
})

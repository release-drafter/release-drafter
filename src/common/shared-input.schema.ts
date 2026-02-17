import z from 'zod'

/**
 * Inputs shared by release-drafter and autolabeler
 */
export const sharedInputSchema = z
  .object({
    /**
     * Access token used to make requests against the GitHub API.
     *
     * Defaults to ${{ github.token }}, or the GITHUB_TOKEN environment variable.
     */
    token: z
      .string()
      .min(1)
      .default(process.env.GITHUB_TOKEN || '')
  })
  .superRefine((data, ctx) => {
    // Inject token into environment variable for use by octokit
    if (data.token && !process.env.GITHUB_TOKEN) {
      process.env.GITHUB_TOKEN = data.token
    }

    if (!process.env.GITHUB_TOKEN) {
      ctx.addIssue({
        code: 'custom',
        message: "Unable to find a token. Please see input 'token'."
      })
    }
  })

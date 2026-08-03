import process from 'node:process'
import { boolean, object, string, stringbool } from 'zod'

/** Inputs shared by the Drafter and Autolabeler Actions. */
export const sharedInputSchema = object({
  token: string()
    .min(1)
    .default(() => process.env.GITHUB_TOKEN || ''),
  'dry-run': stringbool().or(boolean()).optional(),
}).superRefine((data, context) => {
  if (data.token && !process.env.GITHUB_TOKEN)
    process.env.GITHUB_TOKEN = data.token
  if (!process.env.GITHUB_TOKEN) {
    context.addIssue({
      code: 'custom',
      message: "Unable to find a token. Please see input 'token'.",
      path: ['token'],
    })
  }
})

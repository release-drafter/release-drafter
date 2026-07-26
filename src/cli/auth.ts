import { execFile } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const resolveToken = async () => {
  const environmentToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (environmentToken) return environmentToken

  try {
    const { stdout } = await execFileAsync('gh', ['auth', 'token'], {
      encoding: 'utf8',
    })
    const token = stdout.trim()
    if (token) return token
  } catch {
    // The error below explains every supported authentication method.
  }

  throw new Error(
    'GitHub authentication required: set GITHUB_TOKEN or GH_TOKEN, or run `gh auth login`',
  )
}

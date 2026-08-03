import { execFileSync } from 'node:child_process'

export const buildReleaseDrafterPackage = (
  repositoryRoot: string,
  environment: NodeJS.ProcessEnv = process.env,
): void => {
  execFileSync(
    process.execPath,
    [
      process.env.npm_execpath ?? 'node_modules/npm/bin/npm-cli.js',
      'run',
      'build',
      '--workspace',
      'release-drafter',
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: environment,
      stdio: 'pipe',
    },
  )
}

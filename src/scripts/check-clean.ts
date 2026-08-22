import { execFileSync, spawnSync } from 'node:child_process'

const runGit = (arguments_: string[]): string =>
  execFileSync('git', arguments_, {
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
  })

const diffCheck = spawnSync('git', ['diff', '--quiet', '--exit-code'])
if (diffCheck.error) {
  throw diffCheck.error
}
if (diffCheck.status !== 0 && diffCheck.status !== 1) {
  throw new Error(`git diff failed with exit code ${diffCheck.status}`)
}

const hasUnstagedChanges = diffCheck.status === 1
const untracked = runGit(['ls-files', '--others', '--exclude-standard']).trim()

if (hasUnstagedChanges || untracked) {
  console.error(
    '💥 Detected unstaged or untracked changes after build checks. Generated artifacts must match the staged tree.',
  )
  const status = runGit(['status', '--short']).trim()
  if (status) {
    console.error(status)
  }
  if (hasUnstagedChanges) {
    const diff = spawnSync('git', ['diff'], { stdio: 'inherit' })
    if (diff.error) {
      throw diff.error
    }
    if (diff.status !== 0) {
      throw new Error(`git diff failed with exit code ${diff.status}`)
    }
  }
  process.exit(1)
}

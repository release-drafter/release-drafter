import { execSync } from 'node:child_process'

const unstagedDiff = execSync('git diff --text', { encoding: 'utf-8' })
const untracked = execSync('git ls-files --others --exclude-standard', {
  encoding: 'utf-8',
}).trim()

if (unstagedDiff || untracked) {
  console.error(
    '💥 Detected unstaged or untracked changes after build checks. Generated artifacts must match the staged tree.',
  )
  const status = execSync('git status --short', { encoding: 'utf-8' }).trim()
  if (status) {
    console.error(status)
  }
  if (unstagedDiff) {
    console.error(unstagedDiff)
  }
  process.exit(1)
}

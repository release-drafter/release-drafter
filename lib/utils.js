export function runnerIsActions() {
  return process.env['GITHUB_ACTION'] !== undefined
}

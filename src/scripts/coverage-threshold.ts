export const readCoverageThreshold = (name: string): number | undefined => {
  const value = process.env[name]
  if (value === undefined) return undefined

  const threshold = Number(value)
  if (
    value.trim() === '' ||
    !Number.isFinite(threshold) ||
    threshold < 0 ||
    threshold > 100
  ) {
    throw new Error(`Invalid coverage threshold (${name}): ${value}`)
  }
  return threshold
}

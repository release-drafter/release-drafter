export const captureResult = <T>(
  operation: () => T,
): { value: T } | { error: unknown } => {
  try {
    return { value: operation() }
  } catch (error) {
    return { error }
  }
}

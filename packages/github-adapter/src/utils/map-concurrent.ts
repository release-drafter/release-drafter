export const mapConcurrent = async <T, R>(
  items: readonly T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    async () => {
      while (next < items.length) {
        const index = next++
        results[index] = await task(items[index])
      }
    },
  )
  await Promise.all(workers)
  return results
}

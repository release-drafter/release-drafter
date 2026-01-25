import { readFileSync } from 'fs'
import path from 'path'

export const getGqlQuery = (
  query: 'find-commits-with-pr' | 'find-commits-with-path-changes'
) => {
  return readFileSync(path.resolve(import.meta.dirname, `${query}.gql`), {
    encoding: 'utf-8'
  })
}

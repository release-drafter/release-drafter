import { existsSync, readFileSync } from 'node:fs'
import path, { isAbsolute } from 'node:path'
import process from 'node:process'
import * as core from '@actions/core'

export const getConfigFileFromFs = (normalizedFilepath: string) => {
  // normalizeFilepath should have already handled this
  // this is just a safety net
  if (isAbsolute(normalizedFilepath)) {
    throw new Error(
      `Absolute paths are not supported for config file path: ${normalizedFilepath}`,
    )
  }

  if (!process.env.GITHUB_WORKSPACE) {
    throw new Error(
      `env GITHUB_WORKSPACE is not set. Cannot resolve local repo path.`,
    )
  }

  const repoRoot = process.env.GITHUB_WORKSPACE

  const configPath = path.join(repoRoot, normalizedFilepath)

  core.info(`Looking for config locally at ${configPath}...`)

  if (!existsSync(repoRoot)) {
    throw new Error(`Root repo path does not exist: ${repoRoot}`)
  }

  if (!existsSync(configPath)) {
    throw new Error(
      `Config file not found: ${configPath}. Did you clone your sources ? (ex: using @actions/checkout)`,
    )
  }

  core.info(`Loading from file: ${configPath}`)

  return readFileSync(configPath, 'utf8')
}

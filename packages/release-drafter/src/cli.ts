#!/usr/bin/env node

import { runCli } from '@release-drafter/cli'

declare const __RELEASE_DRAFTER_VERSION__: string

try {
  process.exitCode = await runCli(process.argv, __RELEASE_DRAFTER_VERSION__)
} catch (error) {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
}

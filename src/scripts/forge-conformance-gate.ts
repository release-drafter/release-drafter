import { pathToFileURL } from 'node:url'

export type ForgeConformanceGateEnvironment = {
  SCOPE_RESULT?: string
  SHOULD_RUN?: string
  MATRIX_RESULT?: string
}

export type ForgeConformanceGateDecision = {
  success: boolean
  message: string
}

/** Validates the scope and matrix results reported by the workflow. */
export const evaluateForgeConformanceGate = (
  environment: ForgeConformanceGateEnvironment,
): ForgeConformanceGateDecision => {
  const scopeResult = environment.SCOPE_RESULT ?? ''
  const shouldRun = environment.SHOULD_RUN ?? ''
  const matrixResult = environment.MATRIX_RESULT ?? ''

  if (scopeResult !== 'success') {
    return {
      success: false,
      message: `Forge conformance scope finished with ${scopeResult}`,
    }
  }

  if (shouldRun === 'true' && matrixResult === 'success') {
    return {
      success: true,
      message: 'Requested forge conformance matrix passed',
    }
  }

  if (shouldRun === 'true' && matrixResult === 'failure') {
    return {
      success: false,
      message: 'Requested forge conformance matrix finished with failure',
    }
  }

  if (shouldRun === 'false' && matrixResult === 'skipped') {
    return {
      success: true,
      message: 'Forge conformance matrix was intentionally skipped',
    }
  }

  return {
    success: false,
    message: `Unexpected forge conformance result: should-run=${shouldRun} matrix=${matrixResult}`,
  }
}

const main = () => {
  const decision = evaluateForgeConformanceGate(process.env)
  if (decision.success) {
    console.log(decision.message)
    return
  }
  console.error(`::error::${decision.message}`)
  process.exitCode = 1
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()

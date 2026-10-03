import type { AnnotationProperties } from '@actions/core'
import type { ConfigTarget } from './parse-config-target.ts'

/** Carries source locations without attaching external config to local files. */
export class ConfigError extends Error {
  constructor(
    message: string,
    readonly targets: ConfigTarget[],
    readonly position?: { line: number; col: number },
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ConfigError'
  }

  /** Only annotate a single local source or one at the PR head being checked. */
  annotation(
    repo: { owner: string; repo: string },
    headRef: string,
  ): AnnotationProperties {
    const target = this.targets.length === 1 ? this.targets[0] : undefined
    const isLocal =
      target &&
      (target.scheme === 'file' ||
        (target.repo.owner === repo.owner &&
          target.repo.repo === repo.repo &&
          target.ref === headRef))
    return {
      title: 'Invalid Release Drafter configuration',
      ...(isLocal ? { file: target.filepath } : {}),
      ...(isLocal && this.position
        ? { startLine: this.position.line, startColumn: this.position.col }
        : {}),
    }
  }
}

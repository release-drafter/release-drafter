import { spawn } from 'node:child_process'
import { openSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { FORGE_IMAGES } from './images.ts'

export type ConformanceForge = keyof typeof FORGE_IMAGES

export type ContainerDefinition = {
  image: string
  port: number
  environment: Record<string, string>
  tmpfs: Record<string, string>
  cpus?: number
}

const restForge = (
  image: string,
  prefix: 'GITEA' | 'FORGEJO',
): ContainerDefinition => ({
  image,
  port: 3000,
  // Match GitHub's public-runner CPU shape during local verification.
  cpus: 4,
  // Keep repository data on overlay storage; only SQLite is safe on tmpfs.
  tmpfs: {
    '/var/lib/forge-test-db':
      'rw,nosuid,nodev,size=128m,uid=1000,gid=1000,mode=0700',
  },
  environment: {
    [`${prefix}__database__DB_TYPE`]: 'sqlite3',
    [`${prefix}__database__PATH`]: '/var/lib/forge-test-db/gitea.db',
    [`${prefix}__security__INSTALL_LOCK`]: 'true',
    [`${prefix}__server__HTTP_PORT`]: '3000',
    [`${prefix}__log__LEVEL`]: 'warn',
  },
})

/** Containers for the conformance suites. Kept free of npm dependencies. */
export const FORGE_CONTAINERS: Record<ConformanceForge, ContainerDefinition> = {
  gitea: restForge(FORGE_IMAGES.gitea, 'GITEA'),
  forgejo: restForge(FORGE_IMAGES.forgejo, 'FORGEJO'),
  gitlab: {
    image: FORGE_IMAGES.gitlab,
    port: 8181,
    environment: {},
    tmpfs: {},
  },
}

/** Name of the container started before the suite, see `start` below. */
export const prestartedContainerName = (forge: ConformanceForge) =>
  `forge-conformance-${forge}`

export const dockerRunArguments = (forge: ConformanceForge) => {
  const definition = FORGE_CONTAINERS[forge]
  return [
    'run',
    '--detach',
    '--name',
    prestartedContainerName(forge),
    '--publish',
    `127.0.0.1::${definition.port}`,
    ...(definition.cpus ? ['--cpus', String(definition.cpus)] : []),
    ...Object.entries(definition.tmpfs).flatMap(([path, options]) => [
      '--tmpfs',
      `${path}:${options}`,
    ]),
    ...Object.entries(definition.environment).flatMap(([name, value]) => [
      '--env',
      `${name}=${value}`,
    ]),
    definition.image,
  ]
}

// `node containers.ts start <forge>` starts the forge container in the
// background and returns at once, so the image pull and the forge boot overlap
// dependency installation. Set FORGE_CONFORMANCE_PRESTARTED=true for the suite
// to use it. Docker output goes to forge-conformance-<forge>.log in RUNNER_TEMP.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [command, forge] = process.argv.slice(2)
  if (
    command !== 'start' ||
    !forge ||
    !Object.hasOwn(FORGE_CONTAINERS, forge)
  ) {
    throw new Error(
      `Usage: containers.ts start <${Object.keys(FORGE_CONTAINERS).join('|')}>`,
    )
  }
  const log = openSync(
    join(process.env.RUNNER_TEMP ?? tmpdir(), `forge-conformance-${forge}.log`),
    'a',
  )
  spawn('docker', dockerRunArguments(forge as ConformanceForge), {
    detached: true,
    stdio: ['ignore', log, log],
  }).unref()
}

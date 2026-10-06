import { execFile } from 'node:child_process'
import { createWriteStream, writeFileSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'
import { GenericContainer, type StartedTestContainer } from 'testcontainers'
import {
  type ConformanceForge,
  FORGE_CONTAINERS,
  prestartedContainerName,
} from './containers.ts'

export type ExecResult = { exitCode: number; output: string }

/** A running forge container, started here or before the suite. */
export type ForgeInstance = {
  id: string
  serverUrl: string
  exec(command: string[]): Promise<ExecResult>
  stop(logPath?: string): Promise<void>
}

const execFileAsync = promisify(execFile)
const docker = (...args: string[]) =>
  execFileAsync('docker', args, { maxBuffer: 256 * 1024 * 1024 })

const sleep = (milliseconds: number) =>
  new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))

const start = async (forge: ConformanceForge): Promise<ForgeInstance> => {
  const definition = FORGE_CONTAINERS[forge]
  let builder = new GenericContainer(definition.image)
    .withExposedPorts(definition.port)
    .withEnvironment(definition.environment)
    .withTmpFs(definition.tmpfs)
  if (definition.cpus) {
    builder = builder.withResourcesQuota({ cpu: definition.cpus })
  }
  const container: StartedTestContainer = await builder.start()
  return {
    id: container.getId(),
    serverUrl: `http://${container.getHost()}:${container.getMappedPort(definition.port)}`,
    async exec(command) {
      const { exitCode, output } = await container.exec(command)
      return { exitCode, output }
    },
    async stop(logPath) {
      if (!logPath) {
        await container.stop()
        return
      }
      const logs = await container.logs()
      const writeLogs = pipeline(logs, createWriteStream(logPath))
      try {
        await container.stop()
        await writeLogs
      } catch (error) {
        logs.destroy()
        await writeLogs.catch(() => {})
        throw error
      }
    },
  }
}

const dockerExec = async (
  name: string,
  command: string[],
): Promise<ExecResult> => {
  try {
    const { stdout, stderr } = await docker('exec', name, ...command)
    return { exitCode: 0, output: `${stdout}${stderr}` }
  } catch (error) {
    const failure = error as {
      code?: unknown
      stdout?: string
      stderr?: string
    }
    return {
      exitCode: typeof failure.code === 'number' ? failure.code : 1,
      output: `${failure.stdout ?? ''}${failure.stderr ?? String(error)}`,
    }
  }
}

// CI starts the container right after checkout with `containers.ts start`, so
// its image pull and boot overlap dependency installation.
const attach = async (
  forge: ConformanceForge,
  deadline: number,
): Promise<ForgeInstance> => {
  const name = prestartedContainerName(forge)
  let address = ''
  // The container does not exist until its image has been pulled.
  while (!address) {
    address = await docker('port', name, `${FORGE_CONTAINERS[forge].port}/tcp`)
      .then(({ stdout }) => stdout.trim().split('\n')[0] ?? '')
      .catch(() => '')
    if (!address) {
      if (Date.now() > deadline) {
        throw new Error(`The prestarted ${forge} container did not start`)
      }
      await sleep(200)
    }
  }
  const { stdout: id } = await docker('inspect', '--format', '{{.Id}}', name)
  return {
    id: id.trim(),
    serverUrl: `http://${address.replace(/^0\.0\.0\.0:/, '127.0.0.1:')}`,
    exec: (command) => dockerExec(name, command),
    async stop(logPath) {
      if (logPath) {
        const { stdout, stderr } = await docker('logs', name)
        writeFileSync(logPath, `${stdout}${stderr}`)
      }
      await docker('rm', '--force', name)
    },
  }
}

/**
 * Starts the forge container with Testcontainers, or attaches to the one CI
 * started earlier (FORGE_CONFORMANCE_PRESTARTED=true), then waits until
 * `ready` succeeds.
 */
export const startForgeInstance = async (
  forge: ConformanceForge,
  ready: (instance: ForgeInstance) => Promise<boolean>,
  timeoutMs: number,
): Promise<ForgeInstance> => {
  const deadline = Date.now() + timeoutMs
  const instance =
    process.env.FORGE_CONFORMANCE_PRESTARTED === 'true'
      ? await attach(forge, deadline)
      : await start(forge)
  while (!(await ready(instance).catch(() => false))) {
    if (Date.now() > deadline) {
      await instance.stop().catch(() => {})
      throw new Error(`${forge} did not become ready within ${timeoutMs}ms`)
    }
    await sleep(200)
  }
  return instance
}

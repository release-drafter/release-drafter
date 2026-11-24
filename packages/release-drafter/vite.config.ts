import { defineConfig, type ViteUserConfig } from 'vite-plus'
import { createWorkspaceConfig } from '../../vite.workspace.config.ts'

const workspaceConfig = createWorkspaceConfig(import.meta.dirname)

export const publicPackageConfig = {
  ...workspaceConfig,
  run: {
    tasks: {
      'build:package': workspaceConfig.run.tasks.build,
      'generate:notices': {
        command: 'node ../../src/scripts/third-party-notices.ts',
        cache: {
          input: [{ auto: true }, '!THIRD_PARTY_NOTICES'],
          output: ['THIRD_PARTY_NOTICES'],
        },
      },
      build: {
        // Each cached step owns only its outputs, so replaying notices cannot
        // restore an older bundle over a freshly built package.
        command: 'vp run generate:notices',
        dependsOn: ['build:package'],
        cache: false,
      },
    },
  },
} satisfies ViteUserConfig

export default defineConfig(publicPackageConfig)

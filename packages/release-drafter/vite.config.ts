import { defineConfig, type ViteUserConfig } from 'vite-plus'
import { workspaceConfig } from '../../vite.workspace.config.ts'

export const publicPackageConfig = {
  ...workspaceConfig,
  run: {
    tasks: {
      build: {
        command: 'vp pack && node ../../src/scripts/third-party-notices.ts',
        cache: {
          ...workspaceConfig.run.tasks.build.cache,
          output: ['dist/**', 'THIRD_PARTY_NOTICES'],
        },
      },
    },
  },
} satisfies ViteUserConfig

export default defineConfig(publicPackageConfig)

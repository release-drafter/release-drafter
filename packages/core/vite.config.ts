import { defineConfig } from 'vite-plus'
import { createWorkspaceConfig } from '../../vite.workspace.config.ts'

export default defineConfig(createWorkspaceConfig(import.meta.dirname))

import { defineActionInputNames } from '../common/action-contract.ts'
import type { ActionInput } from './action-input.schema.ts'

export const actionInputNames = defineActionInputNames<ActionInput>()([
  'config-name',
  'token',
  'name',
  'tag',
  'version',
  'from',
  'publish',
  'latest',
  'prerelease',
  'prerelease-identifier',
  'include-pre-releases',
  'commitish',
  'header',
  'footer',
  'dry-run',
  'filter-by-range',
])

export const actionOutputNames = [
  'id',
  'html_url',
  'upload_url',
  'tag_name',
  'name',
  'resolved_version',
  'major_version',
  'minor_version',
  'patch_version',
  'body',
] as const

import { Application, Context } from 'probot'
import { SortDirection } from './sort-pull-requests'

export interface DefaultParams {
  app: Application
  context: Context
}

export interface PullRequest {
  mergedAt: string
}

export interface Config {
  branches: string | string[]
  'change-template': string
  'no-changes-template': string
  'version-template': string
  categories: string[]
  'exclude-labels': string[]
  replacers: any[]
  'sort-direction': SortDirection
}

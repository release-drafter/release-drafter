import { Application, Context } from 'probot'

export interface DefaultParams {
  app: Application
  context: Context
}

export interface PullRequest {
  mergedAt: string
}

import { DefaultParams } from './types'

interface Params extends DefaultParams {
  message: string
  info?: string
}

export default function log({ app, context, message, info }: Params) {
  const repo = context.payload.repository
  const prefix = repo ? `${repo.full_name}: ` : ''
  const logString = `${prefix}${message}`

  if (info) {
    app.log(logString, info)
  } else {
    app.log(logString)
  }
}

module.exports = ({ app, context, message }) => {
  const repo = context.payload.repository
  const prefix = repo ? `${repo.owner.login}/${repo.owner.name}: ` : ''

  app.log(`${prefix}${message}`)
}

const run = require('./lib/run')
const configName = 'draftah.yml'

module.exports = robot => {
  robot.on('push', async context => {
    await run({ robot, context, configName })
  })
}

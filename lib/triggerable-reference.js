const { log } = require('./log')

const isTriggerableReference = ({ context, ref, config }) => {
  const { GITHUB_ACTIONS } = process.env
  if (GITHUB_ACTIONS) {
    // Let GitHub Action determine when to run the action based on the workflow's on syntax
    // See https://help.github.com/en/actions/reference/workflow-syntax-for-github-actions#on
    return true
  }
  const referenceRegex = /^refs\/(?:heads|tags)\//
  const refernces = config.references.map((r) => r.replace(referenceRegex, ''))
  const shortReference = ref.replace(referenceRegex, '')
  const validReference = new RegExp(refernces.join('|'))
  const relevant = validReference.test(shortReference)
  if (!relevant) {
    log({
      context,
      message: `Ignoring push. ${shortReference} does not match: ${refernces.join(
        ', '
      )}`,
    })
  }
  return relevant
}

exports.isTriggerableReference = isTriggerableReference

module.exports = {
  '*.js': (filenames) => `eslint --fix ${filenames.join(' ')}`,
  '*.{md,json,yml,yaml}': (filenames) =>
    `prettier --write ${filenames.join(' ')}`,
  'action.js|lib/**/*.js': () => 'yarn run build',
}

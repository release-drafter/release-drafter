module.exports = {
  '*.js': (filenames) => `eslint --fix ${filenames.join(' ')}`,
  '*.{md,json,yml,yaml}': (filenames) =>
    `prettier --write ${filenames.join(' ')}`,
  'action.js|lib/**/*.js': () => 'ncc build action.js --target es2021',
}

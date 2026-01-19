// See: https://rollupjs.org/introduction/

const commonjs = require('@rollup/plugin-commonjs')
const nodeResolve = require('@rollup/plugin-node-resolve')
const json = require('@rollup/plugin-json')

module.exports = {
  input: 'lib/action.js',
  output: {
    file: 'dist/index.js',
    format: 'commonjs',
    name: 'release-drafter',
  },
  plugins: [
    json(),
    nodeResolve({ preferBuiltins: true }),
    commonjs({
      ignoreDynamicRequires: true,
    }),
  ],
}

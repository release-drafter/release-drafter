module.exports = {
  testRegex: '(/test/.*.(test|spec)).js$',
  moduleFileExtensions: ['js', 'json', 'node'],
  collectCoverage: true,
  coveragePathIgnorePatterns: ['(test/.*.mock).(jsx?|tsx?)$'],
  verbose: true,
}

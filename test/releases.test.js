const { generateChangeLog } = require('../lib/releases')
const each = require('jest-each').default
const { DEFAULT_CONFIG } = require('../lib/default-config')

const config = {
  ...DEFAULT_CONFIG,
  template: '$CHANGES',
  references: ['master'],
}

describe('releases', () => {
  describe('generateChangeLog', () => {
    it('does not escape normal titles', () => {
      const pullRequests = [
        { title: 'A1', number: 1, body: 'A1 body', url: 'https://github.com', labels:{ nodes:[{ name: 'bug'}] } },
        { title: 'B2', number: 2, body: 'B2 body', url: 'https://github.com', labels:{ nodes:[{ name: 'feature' }] } },
        { title: 'C3', number: 3, body: 'C3 body', url: 'https://github.com', labels:{ nodes:[{ name: 'bug'}] } },
      ]
      const changelog = generateChangeLog(pullRequests, config)
  
      expect(changelog).toEqual('* A1 (#1) @ghost\n* B2 (#2) @ghost\n* C3 (#3) @ghost') // Getting output...
    })
  })
})

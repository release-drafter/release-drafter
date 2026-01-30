import { describe, it } from 'vitest'

describe('config-loading', () => {
  describe('when specifying "filepath"', () => {
    it('prepends .github/ in front of the filepath if it does not already start with .github/', async () => {})
    describe('when path filepath has complex relative paths', () => {
      it('normalizes the complex relative paths', async () => {
        // allows getting out of .github folder,
        // e.g. '.github/../configs/release-drafter.yml' should be normalized to 'configs/release-drafter.yml'
        // octokit does not support complex relative paths in its ref parameter
      })
    })
    describe('when local file exists', () => {
      it('finds the file', async () => {})
    })
    describe('when local file does not exist', () => {
      describe('but it exists in the same remote context', () => {
        // meaning in the same repo at the ref being run against
        // enables not having to checkout repo to get config from your non-default branch
        // though this would obviously prevent dynamic overrides with sed or whatever in previous steps
        it('finds the file', async () => {})
      })
      describe('and it does not exist in the same remote context', () => {
        it('returns an empty config', async () => {})
      })
    })
  })
  describe('when specifying "filepath@ref"', () => {
    it('uses the specified ref to find the file', async () => {})
  })
  describe('when specifying "owner/repo:filepath"', () => {
    it('uses the specified repo & owner to find the file in the default branch', async () => {})
  })
  describe('when specifying "repo:filepath"', () => {
    it('uses the specified repo in the current org (or owner) to find the file in the default branch', async () => {})
  })
  describe('when specifying "repo:filepath@ref"', () => {
    it('uses the specified repo in the current org (or owner) to find the file at the specified ref', async () => {})
  })
  describe('when specifying "owner/repo:filepath@ref"', () => {
    it('uses the specified repo and org (or owner) to find the file at the specified ref', async () => {})
  })
  describe('when remote target is a symlink', () => {
    it('follows the symlink', async () => {})
  })
  describe('when remote target is a directory', () => {
    it('returns an empty config', async () => {})
  })
  describe('when remote target is not found', () => {
    it('returns an empty config', async () => {})
  })
  describe('when the file has an _extend key', () => {
    describe('when _extend is "filepath"', () => {
      it('does not attempt to find the file locally', () => {})
      it('it tries to find the file in the current runtime context', () => {})
    })
    describe('when _extend is a valid target', () => {
      it('it merges the configs together', () => {})
    })
  })
})

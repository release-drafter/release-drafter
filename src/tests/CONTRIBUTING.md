# Contributing to tests

## Porting tests from v6

### Github Actions Context

Tests in v7 work kind of differently because of the Probot removal. Probot
allowed specifying a context easily using :

```typescript
await probot.receive({
  name: 'push',
  payload: pushTagPayload
})
```

... which would spin up the execution of our action, aswell as the actual
_Github Actions Context_.

Defining the _Github Actions Context_ (as imported by `@actions/github`) is now
handled by defining the underlying `GITHUB_*` environment variables for each
test suites. If done properly, `import { context } from @actions/github` will
now contain the specified variables.

> [!note] Take a look at [`.env.example`](../../.env.example) and
> [mocks/context.ts](./mocks/context.ts) for more details.

To do this efficiently in test suites, we use a helper :

```ts
it('does nothing', async () => {
  await mockContext({
    payload: 'push-non-master-branch'
  })

  // process.env.GITHUB_REF now has a value coherent
  // with payload __fixtures__/events/push-non-master-branch.json
  // also avalable in context.ref & context.payload.ref
  await run()
})
```

### Include nock scopes

In the original tests, not much was used in regard to
[`nock`'s expectations capabilities](https://github.com/nock/nock?tab=readme-ov-file#expectations).

Whenever you write a suite that uses `nock`, please get the scope variable out
of the `nock()` call, and write the corresponding jest expectation.

For example, where mocked endpoints are **not** expected to be called :

```typescript
describe('to a non-master branch', () => {
  it('does nothing', async () => {
    const scope = nock('https://api.github.com')
      .post('/repos/:owner/:repo/releases')
      .reply(200)
      .patch('/repos/:owner/:repo/releases/:release_id')
      .reply(200)

    await run()

    expect(scope.isDone()).toBe(false) // should NOT call the mocked endpoints
  })
})
```

... or using one of the new mocking helpers :

```typescript
const scope = nockGetReleases({ releaseFiles: ['release.json'] })
expect(scope.isDone()).toBe(true) // should call the mocked endpoint
```

### Mocking : "fetching previous releases"

```typescript
nock('https://api.github.com')
  .get('/repos/toolmantim/release-drafter-test-project/releases')
  .query(true)
  .reply(200, [releasePayload])
```

...becomes

```typescript
const scope = nockGetReleases({ releaseFiles: ['release.json'] })
```

### Mocking : `release-drafter.yml` config file

```ts
import { mockConfig, unmockConfig } from '../__fixtures__/config.js'

describe('when pushing to non-master branch', () => {
  it('creates a release draft targeting that branch', async () => {
    mockConfig({ file: 'config-non-master-branch.yml' })

    await run()

    expect(something).toBe(done)
    unmockConfig()
  })
})
```

### Mocking : graphql calls

There is exactly to instances of GrpahQL calls possibly made by release-drafter,
and the syntax to mock their response is always the same. The following helper
eases porting the tests :

```ts
it('creates a release draft', async () => {
  // uses nock
  const gqlScope = mockGraphqlQuery({
    payload: 'graphql-commits-no-prs.json',
    query: 'query findCommitsWithAssociatedPullRequests' // the default
  })

  await run()

  expect(gqlScope).toBe(true)
})
```

const { paginate } = require('../lib/pagination')

describe('pagination', () => {
  it('concats pagination results', async () => {
    const queryFunction = jest.fn()
    // query is empty because we mock the result
    const query = ``

    queryFunction
      .mockReturnValueOnce(
        Promise.resolve({
          repository: {
            object: {
              history: {
                nodes: ['a', 'b', 'c'],
                pageInfo: {
                  endCursor: 'aaa',
                  hasNextPage: true,
                },
              },
            },
          },
        })
      )
      .mockReturnValueOnce(
        Promise.resolve({
          repository: {
            object: {
              history: {
                nodes: ['d', 'e', 'f'],
                pageInfo: {
                  endCursor: 'bbb',
                  hasNextPage: false,
                },
              },
            },
          },
        })
      )

    const data = await paginate(queryFunction, query, {}, [
      'repository',
      'object',
      'history',
    ])

    expect(queryFunction).toHaveBeenCalledTimes(2)
    expect(data.repository.object.history.nodes).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
    ])
    expect(data.repository.object.history.pageInfo).toEqual({
      endCursor: 'bbb',
      hasNextPage: false,
    })
  })

  it("throws when query doesn't return `nodes` or `pageInfo` fields", async () => {
    const queryFunction = jest.fn()
    // query is empty because we mock the result
    const query = ``

    queryFunction.mockReturnValueOnce(Promise.resolve({}))

    expect(paginate(queryFunction, query, {}, [])).rejects.toThrow()
  })
})

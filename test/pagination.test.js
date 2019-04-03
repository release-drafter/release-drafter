const paginate = require('../lib/pagination')

describe('pagination', () => {
  it('concats pagination results', async () => {
    const queryFn = jest.fn()

    queryFn
      .mockReturnValueOnce(
        Promise.resolve({
          repository: {
            ref: {
              target: {
                history: {
                  nodes: ['a', 'b', 'c'],
                  pageInfo: {
                    endCursor: 'aaa',
                    hasNextPage: true
                  }
                }
              }
            }
          }
        })
      )
      .mockReturnValueOnce(
        Promise.resolve({
          repository: {
            ref: {
              target: {
                history: {
                  nodes: ['d', 'e', 'f'],
                  pageInfo: {
                    endCursor: 'bbb',
                    hasNextPage: false
                  }
                }
              }
            }
          }
        })
      )

    const query = ``
    const data = await paginate(queryFn, query, {}, [
      'repository',
      'ref',
      'target',
      'history'
    ])

    expect(queryFn).toHaveBeenCalledTimes(2)
    expect(data.repository.ref.target.history.nodes).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f'
    ])
  })
})

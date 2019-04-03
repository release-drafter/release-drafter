const _ = require('lodash')

async function paginate(queryFn, query, variables, dataPath) {
  const nodesPath = [...dataPath, 'nodes']
  let data = await queryFn(query, variables)
  let hasNextPage = getHasNextPage(data, dataPath)

  while (hasNextPage) {
    const newData = await queryFn(query, {
      ...variables,
      after: _.get(data, [...dataPath, 'pageInfo', 'endCursor'])
    })
    const newNodes = _.get(newData, nodesPath)
    hasNextPage = getHasNextPage(newData, dataPath)

    _.update(data, nodesPath, d => {
      return d.concat(newNodes)
    })
  }

  return data
}

function getHasNextPage(data, dataPath) {
  return _.get(data, [...dataPath, 'pageInfo', 'hasNextPage'])
}

module.exports = paginate

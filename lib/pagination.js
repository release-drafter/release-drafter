const _ = require('lodash')

async function paginate(queryFn, query, variables, dataPath) {
  const nodesPath = [...dataPath, 'nodes']
  const pageInfoPath = [...dataPath, 'pageInfo']

  let data = await queryFn(query, variables)
  let hasNextPage = getHasNextPage(data, pageInfoPath)

  while (hasNextPage) {
    const newData = await queryFn(query, {
      ...variables,
      after: _.get(data, [...pageInfoPath, 'endCursor'])
    })
    const newNodes = _.get(newData, nodesPath)
    const newPageInfo = _.get(newData, pageInfoPath)
    hasNextPage = getHasNextPage(newData, pageInfoPath)

    _.set(data, pageInfoPath, newPageInfo)
    _.update(data, nodesPath, d => d.concat(newNodes))
  }

  return data
}

function getHasNextPage(data, pageInfoPath) {
  return _.get(data, [...pageInfoPath, 'hasNextPage'])
}

module.exports = paginate

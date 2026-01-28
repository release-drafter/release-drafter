import { _ } from "../lodash.js";
async function paginateGraphql(client, query, requestParameters, paginatePath) {
  const nodesPath = [...paginatePath, "nodes"];
  const pageInfoPath = [...paginatePath, "pageInfo"];
  const endCursorPath = [...pageInfoPath, "endCursor"];
  const hasNextPagePath = [...pageInfoPath, "hasNextPage"];
  const hasNextPage = (data2) => _.get(data2, hasNextPagePath);
  const data = await client(query, requestParameters);
  if (!_.has(data, nodesPath)) {
    throw new Error(
      "Data doesn't contain `nodes` field. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `nodes` field."
    );
  }
  if (!_.has(data, pageInfoPath) || !_.has(data, endCursorPath) || !_.has(data, hasNextPagePath)) {
    throw new Error(
      "Data doesn't contain `pageInfo` field with `endCursor` and `hasNextPage` fields. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `pageInfo` field."
    );
  }
  while (hasNextPage(data)) {
    const newData = await client(query, {
      ...requestParameters,
      after: _.get(data, [...pageInfoPath, "endCursor"])
    });
    const newNodes = _.get(newData, nodesPath);
    const newPageInfo = _.get(newData, pageInfoPath);
    _.set(data, pageInfoPath, newPageInfo);
    _.update(data, nodesPath, (d) => [...d, ...newNodes]);
  }
  return data;
}
export {
  paginateGraphql
};

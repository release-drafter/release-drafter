import type { CodegenConfig } from '@graphql-codegen/cli'

/**
 * This config is meant to be executed by the codegen CLI tool
 * @see package.json#scripts.codegen
 */
const githubConfig: CodegenConfig = {
  schema: {
    'https://docs.github.com/public/fpt/schema.docs.graphql': {
      headers: {
        'User-Agent': 'graphql-federation-graphql',
      },
    },
  },
  config: {
    // GitHub's published schema has deprecation mismatches between interfaces
    // and their implementations that GraphQL 17 rejects during schema validation.
    assumeValid: true,
    documentMode: 'string',
    enumsAsTypes: true,
    useTypeImports: true,
    scalars: {
      URI: 'string',
      DateTime: 'string',
      GitObjectID: 'string',
    },
  },
  generates: {
    'src/types/github.graphql.generated.ts': {
      documents: 'src/**/*.gql',
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
    },
    'packages/github-adapter/src/types/github.graphql.generated.ts': {
      documents: 'packages/github-adapter/src/graphql/**/*.gql',
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        onlyOperationTypes: true,
      },
    },
  },
}

export default githubConfig

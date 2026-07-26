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
  documents: 'src/**/*.gql',
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
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
    },
  },
}

export default githubConfig

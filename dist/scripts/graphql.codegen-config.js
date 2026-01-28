const githubConfig = {
  schema: {
    "https://docs.github.com/public/fpt/schema.docs.graphql": {
      headers: {
        "User-Agent": "graphql-federation-graphql"
      }
    }
  },
  documents: "src/**/*.gql",
  config: {
    enumsAsTypes: true,
    scalars: {
      URI: "string",
      DateTime: "string"
    }
  },
  generates: {
    "src/types/github.graphql.generated.ts": {
      plugins: ["typescript"]
    },
    "src/": {
      preset: "near-operation-file",
      presetConfig: {
        extension: ".graphql.generated.ts",
        baseTypesPath: "types/github.graphql.generated.ts"
      },
      plugins: ["typescript-operations"]
    }
  }
};
export {
  githubConfig as default
};

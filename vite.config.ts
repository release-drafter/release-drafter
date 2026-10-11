import { builtinModules } from 'node:module'
import {
  defaultClientConditions,
  defaultServerConditions,
  defineConfig,
} from 'vite-plus'
import { readCoverageThreshold } from './src/scripts/coverage-threshold.ts'

const WORKSPACE_SOURCE_CONDITION = 'release-drafter-source'
const repositoryInputs = [
  '**/*',
  '!dist/**',
  '!packages/*/dist/**',
  '!coverage/**',
  '!**/node_modules/**',
  '!.git/**',
  '!.codegraph/**',
  '!packages/*/THIRD_PARTY_NOTICES',
]

export default defineConfig({
  run: {
    tasks: {
      'build:actions': { command: 'vp build' },
      'build:workspaces': {
        command: "vp run --filter './packages/*' --fail-if-no-match build",
        cache: false,
      },
      build: {
        command: 'vp run build:workspaces',
        dependsOn: ['build:actions'],
        cache: false,
      },
      'test:run': {
        command: 'vp test run',
        cache: {
          env: ['COVERAGE_THRESHOLD', 'BRANCH_COVERAGE_THRESHOLD'],
          // Tests inspect repository metadata as well as source and fixtures.
          // Explicit inputs avoid fingerprinting the generated coverage directory.
          input: repositoryInputs,
          output: ['coverage/**'],
        },
      },
      'generate:schemas': {
        command: 'node src/scripts/json-schema.ts',
        dependsOn: ['build:workspaces'],
        cache: {
          input: [
            'src/scripts/json-schema.ts',
            'vite.config.ts',
            'package.json',
            'package-lock.json',
            '.node-version',
            'packages/autolabeler/dist/**',
            'packages/core/dist/**',
            'packages/gh-actions/dist/**',
          ],
          output: [
            'schema.json',
            'drafter/schema.json',
            'autolabeler/schema.json',
          ],
        },
      },
      'generate:action-metadata': {
        command: 'node src/scripts/action-metadata.ts',
        cache: {
          input: [
            'src/scripts/action-metadata.ts',
            'src/scripts/action-metadata-config.ts',
            'src/scripts/action-metadata/**/*.yml',
            'package.json',
            'package-lock.json',
            '.node-version',
          ],
          output: [
            'action.yml',
            'drafter/action.yml',
            'autolabeler/action.yml',
            'check-pr/action.yml',
          ],
        },
      },
      'generate:graphql': {
        command: 'graphql-codegen -c src/scripts/graphql.codegen-config.ts -v',
        // GitHub's live schema can change without any local input changing.
        cache: false,
      },
      'check:dependencies': {
        command:
          'KNIP_DISABLE_RAW_TRANSFER=1 knip --config knip.jsonc --no-progress',
        cache: { input: repositoryInputs, output: [] },
      },
      'check:dependencies:production': {
        command:
          "KNIP_DISABLE_RAW_TRANSFER=1 knip --config knip.jsonc --no-progress --strict --exclude dependencies,files --workspace './packages/*' --workspace '!release-drafter'",
        cache: { input: repositoryInputs, output: [] },
      },
      'check:packages': {
        command: 'node src/scripts/guard-packages.ts',
        cache: false,
      },
      'check:workspaces': {
        command: 'vp run check:packages',
        dependsOn: ['check:dependencies', 'check:dependencies:production'],
        cache: false,
      },
      'test:package-readiness': {
        command:
          'vp test run --config vitest.artifacts.config.ts src/tests/artifacts/release-drafter && vp run check:package-readiness',
        dependsOn: ['release-drafter#build'],
        cache: false,
      },
      'test:artifacts': {
        command: 'vp test run --config vitest.artifacts.config.ts',
        dependsOn: ['build'],
        cache: false,
      },
    },
  },
  staged: {
    '*': 'vp check --fix',
  },
  lint: {
    ignorePatterns: [
      '**/dist/**',
      'coverage/**',
      '**/*.generated.ts',
      'linter/**',
      'logs/**',
      '.licenses/**',
    ],
    plugins: ['typescript', 'unicorn', 'oxc', 'vitest'],
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error',
      'eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['src/**'],
              message: "Use the '#src/*' subpath import alias instead.",
            },
          ],
        },
      ],
      'vitest/no-focused-tests': 'error',
      // Vitest accepts an optional assertion message as its second argument.
      'vitest/valid-expect': ['error', { maxArgs: 2 }],
    },
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    printWidth: 80,
    singleQuote: true,
    semi: false,
    sortPackageJson: false,
    overrides: [
      {
        files: ['**/*.json5'],
        // Biome treated JSON5 as JSON, independently of JavaScript quote style.
        options: { singleQuote: false, quoteProps: 'preserve' },
      },
      {
        files: ['**/*.code-snippets'],
        options: { trailingComma: 'none' },
      },
    ],
    ignorePatterns: [
      '**/dist/**',
      'coverage/**',
      '**/*.generated.ts',
      'linter/**',
      'logs/**',
      '.licenses/**',
      'src/tests/fixtures/config/config-with-yaml-exception.yml',
    ],
  },
  resolve: {
    conditions: [WORKSPACE_SOURCE_CONDITION, ...defaultClientConditions],
    tsconfigPaths: true,
  },
  // GitHub Actions libraries read inputs and context from process.env at runtime.
  // Preserve those accesses in the actual build environment instead of replacing
  // them with empty objects during bundling.
  environments: {
    client: {
      keepProcessEnv: true,
    },
    ssr: {
      resolve: {
        conditions: [WORKSPACE_SOURCE_CONDITION, ...defaultServerConditions],
      },
    },
  },
  build: {
    target: 'node24',
    rolldownOptions: {
      // platform: 'node' makes rolldown generate a createRequire-based __require
      // for CJS modules (e.g. undici via @actions/github) instead of the default
      // stub that throws in ESM environments without a global `require`.
      platform: 'node',
      external: (id) => id.startsWith('node:') || builtinModules.includes(id),
      input: {
        'actions/drafter/run': 'packages/gh-actions/src/drafter/run.ts',
        'actions/autolabeler/run': 'packages/gh-actions/src/autolabeler/run.ts',
        'actions/check-pr/run': 'packages/gh-actions/src/check-pr/run.ts',
      },
      output: {
        format: 'es',
        // Keep dependency Unicode literals visible to repository scanners while
        // preserving their runtime values and readable, unminified output.
        minify: {
          compress: false,
          mangle: false,
          codegen: { asciiOnly: true, removeWhitespace: false },
        },
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        paths: (id) => (builtinModules.includes(id) ? `node:${id}` : id),
      },
    },
    minify: false,
  },
  test: {
    include: ['src/tests/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
    // Real-forge suites require Docker and unrestricted network access. Keep
    // them opt-in through their dedicated Vitest configurations.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.container.test.ts',
      'src/tests/artifacts/**',
    ],
    testTimeout: 60000,
    setupFiles: ['src/tests/setup.ts'],
    coverage: {
      enabled: true,
      reporter: ['json-summary'],
      reportOnFailure: true,
      thresholds: {
        statements: readCoverageThreshold('COVERAGE_THRESHOLD'),
        branches: readCoverageThreshold('BRANCH_COVERAGE_THRESHOLD'),
      },
      include: ['src/**/*.ts', 'packages/*/src/**/*.ts'],
      exclude: [
        'src/tests/**/*.ts',
        'packages/*/src/**/*.test.ts',
        'src/scripts/**/*',
        'src/**/*.generated.ts',
        'packages/*/src/**/*.generated.ts',
      ],
    },
  },
})

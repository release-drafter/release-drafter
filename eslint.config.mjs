// See: https://eslint.org/docs/latest/use/configure/configuration-files

import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import vitest from '@vitest/eslint-plugin'

export default [
  {
    ignores: [
      '**/coverage',
      '**/dist',
      '**/linter',
      '**/node_modules',
      '**/*.generated.ts',
      '**/logs'
    ]
  },
  ...typescriptEslint.configs['flat/recommended'],
  prettierRecommended,
  {
    plugins: {
      vitest
    },

    languageOptions: {
      globals: {
        ...globals.node,
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly'
      },

      parser: tsParser,
      ecmaVersion: 2024,
      sourceType: 'module',

      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.mjs', 'vite.config.ts']
        },
        tsconfigRootDir: import.meta.dirname
      }
    },

    rules: {
      camelcase: 'off',
      'eslint-comments/no-use': 'off',
      'eslint-comments/no-unused-disable': 'off',
      'i18n-text/no-en': 'off',
      'no-console': 'off',
      'no-shadow': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'prettier/prettier': 'error'
    }
  }
]

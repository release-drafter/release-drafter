# Copilot Instructions

This GitHub Action is written in TypeScript and transpiled to JavaScript. Both
the TypeScript sources and the **generated** JavaScript code are contained in
this repository. The TypeScript sources are contained in the `src` directory and
the JavaScript code is contained in the `dist` directory. A GitHub Actions
workflow checks that the JavaScript code in `dist` is up-to-date. Therefore, you
should not review any changes to the contents of the `dist` folder and it is
expected that the JavaScript code in `dist` closely mirrors the TypeScript code
it is generated from.

## Repository Structure

| Path                 | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `__fixtures__/`      | Unit Test Fixtures                                       |
| `__tests__/`         | Unit Tests                                               |
| `.devcontainer/`     | Development Container Configuration                      |
| `.github/`           | GitHub Configuration                                     |
| `.licenses/`         | License Information                                      |
| `.vscode/`           | Visual Studio Code Configuration                         |
| `badges/`            | Badges for readme                                        |
| `dist/`              | Generated JavaScript Code                                |
| `src/`               | TypeScript Source Code                                   |
| `.env.example`       | Environment Variables Example for `@github/local-action` |
| `.licensed.yml`      | Licensed Configuration                                   |
| `.markdown-lint.yml` | Markdown Linter Configuration                            |
| `.node-version`      | Node.js Version Configuration                            |
| `.prettierrc.yml`    | Prettier Formatter Configuration                         |
| `.yaml-lint.yml`     | YAML Linter Configuration                                |
| `action.yml`         | GitHub Action Metadata                                   |
| `CODEOWNERS`         | Code Owners File                                         |
| `eslint.config.mjs`  | ESLint Configuration                                     |
| `jest.config.js`     | Jest Configuration                                       |
| `LICENSE`            | License File                                             |
| `package.json`       | NPM Package Configuration                                |
| `README.md`          | Project Documentation                                    |
| `rollup.config.ts`   | Rollup Bundler Configuration                             |
| `tsconfig.json`      | TypeScript Configuration                                 |

## Environment Setup

Install dependencies by running:

```bash
npm install
```

## Testing

Ensure all unit tests pass by running:

```bash
npm run test
```

Unit tests should exist in the `__tests__` directory. They are powered by
`jest`. Fixtures should be placed in the `__fixtures__` directory.

## Bundling

Any time files in the `src` directory are changed, you should run the following
command to bundle the TypeScript code into JavaScript:

```bash
npm run bundle
```

## General Coding Guidelines

- Follow standard TypeScript and JavaScript coding conventions and best
  practices
- Changes should maintain consistency with existing patterns and style
- Document changes clearly and thoroughly, including updates to existing
  comments when appropriate
- Do not include basic, unnecessary comments that simply restate what the code
  is doing (focus on explaining _why_, not _what_)
- Use consistent error handling patterns throughout the codebase
- Use TypeScript's type system to ensure type safety and clarity
- Keep functions focused and manageable
- Use descriptive variable and function names that clearly convey their purpose
- Use JSDoc comments to document functions, classes, and complex logic
- After doing any refactoring, ensure to run `npm run test` to ensure that all
  tests still pass and coverage requirements are met
- When suggesting code changes, always opt for the most maintainable approach.
  Try your best to keep the code clean and follow "Don't Repeat Yourself" (DRY)
  principles
- Avoid unnecessary complexity and always consider the long-term maintainability
  of the code
- When writing unit tests, try to consider edge cases as well as the main path
  of success. This will help ensure that the code is robust and can handle
  unexpected inputs or situations
- Use the `@actions/core` package for logging over `console` to ensure
  compatibility with GitHub Actions logging features

### Versioning

GitHub Actions are versioned using branch and tag names. Please ensure the
version in the project's `package.json` is updated to reflect the changes made
in the codebase. The version should follow
[Semantic Versioning](https://semver.org/) principles.

## Pull Request Guidelines

When creating a pull request (PR), please ensure that:

- Keep changes focused and minimal (avoid large changes, or consider breaking
  them into separate, smaller PRs)
- Formatting checks pass
- Linting checks pass
- Unit tests pass and coverage requirements are met
- The action has been transpiled to JavaScript and the `dist` directory is
  up-to-date with the latest changes in the `src` directory
- If necessary, the `README.md` file is updated to reflect any changes in
  functionality or usage

The body of the PR should include:

- A summary of the changes
- A special note of any changes to dependencies
- A link to any relevant issues or discussions
- Any additional context that may be helpful for reviewers

## Code Review Guidelines

When performing a code review, please follow these guidelines:

- If there are changes that modify the functionality/usage of the action,
  validate that there are changes in the `README.md` file that document the new
  or modified functionality

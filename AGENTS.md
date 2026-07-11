# AGENTS.md

## Repository Overview

This GitHub Action is written in TypeScript and transpiled to JavaScript. Both
the TypeScript sources and the generated JavaScript code are contained in this
repository.

- `src/`: TypeScript source code
- `dist/`: generated JavaScript code

Do not review changes to `dist/` in isolation. It is expected to closely mirror
the code generated from `src/`. CI checks that `dist/` is up to date.

## Repository Structure

| Path             | Description                                      |
| ---------------- | ------------------------------------------------ |
| `.devcontainer/` | Development container configuration              |
| `.github/`       | GitHub configuration                             |
| `.licenses/`     | License information                              |
| `.vscode/`       | VS Code configuration                            |
| `autolabeler/`   | Entrypoint for the Autolabeler action            |
| `badges/`        | Badges for README                                |
| `coverage/`      | Non-versioned coverage output                    |
| `dist/`          | Generated JavaScript code                        |
| `docs/`          | Documentation complementary to `README.md`       |
| `drafter/`       | Entrypoint for the Drafter action                |
| `src/`           | TypeScript source code                           |
| `.node-version`  | Node.js version configuration                    |
| `biome.jsonc`    | Biome linter and formatter configuration         |
| `action.yml`     | Entrypoint to the Drafter action                 |
| `vite.config.ts` | Vite configuration for bundling and testing      |
| `LICENSE`        | License file                                     |
| `package.json`   | NPM package configuration                        |
| `README.md`      | Project documentation                            |
| `tsconfig.json`  | TypeScript configuration                         |

## Setup

Install dependencies:

```bash
npm install
```

## Required Checks

Before pushing, run the full pipeline so formatting, linting, type checks,
tests, and generated files are all up to date:

```bash
npm run all
```

CI will fail if generated files are stale.

## Testing

Type-check with:

```bash
npm run tsc:check
```

Run unit tests with:

```bash
npm run test:run
```

Do not use `npm run test` for normal verification. It starts the Vite
development server and is intended for interactive sessions.

Tests live in `src/tests` and use `vitest`.

## Bundling

Before pushing changes, ensure `dist/` is regenerated from `src/`:

```bash
npm run build
```

## Coding Guidelines

- Follow existing TypeScript and JavaScript conventions in the repo.
- Keep changes minimal and consistent with surrounding patterns.
- Update documentation and comments when behavior changes.
- Avoid comments that restate obvious code; explain why when needed.
- Use consistent error-handling patterns.
- Lean on TypeScript for type safety and clarity.
- Keep functions focused and manageable.
- Use descriptive names.
- Use JSDoc for public functions, classes, and non-obvious logic.
- Prefer maintainable, simple solutions over unnecessary complexity.
- Cover both happy paths and edge cases in unit tests when adding or changing
  behavior.
- Use `@actions/core` for logging instead of `console`.
- Do not use Zod `refine` or `superRefine` on schemas that are converted to JSON
  schema. Keep those schemas JSON-schema-compatible and perform semantic
  validation at runtime parsing or config validation time instead.

## Versioning

GitHub Actions are versioned using branch and tag names. Keep the version in
`package.json` aligned with codebase changes and follow
[Semantic Versioning](https://semver.org/).

## Pull Requests

- Keep changes focused and minimal.
- Ensure formatting, linting, and unit tests pass.
- Ensure `dist/` is up to date with the latest source changes.
- Update `README.md` when functionality or usage changes.

PR bodies should include:

- A summary of the changes.
- Any dependency changes.
- Links to relevant issues or discussions.
- Extra reviewer context when helpful.

## Code Review

- If a change modifies functionality or usage, confirm that `README.md` was
  updated accordingly.

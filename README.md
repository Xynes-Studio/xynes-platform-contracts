# Xynes Platform Contracts

Shared contracts and utilities for the Xynes platform. This repository is a Monorepo managed with [Bun](https://bun.sh).

## Structure

The `packages` directory contains the following shared libraries:

- **[`@xynes/contracts`](./packages/contracts)**: Centralized TypeScript types and Zod schemas.
- **[`@xynes/errors`](./packages/errors)**: Standardized error classes (Domain, Validation, NotFound) and HTTP error response shapes.
- **[`@xynes/config`](./packages/config)**: Configuration utilities, including `createEnv` for type-safe environment variable parsing.

## Development

### Global Standards
- **Runtime**: Bun
- **Language**: TypeScript
- **Testing**: Bun Test (TDD, >75% coverage)
- **Linting**: ESLint (Flat Config) + Prettier

### Commands

- **Install Dependencies**: `bun install`
- **Build**: `bun run check` (compiles TS types)
- **Test**: `bun test` (runs all unit tests)
- **Lint**: `bun run lint` (checks code quality)
- **Format**: `bun run lint:fix` (fixes linting & formatting issues)

## Workflow

1. Create a new package in `packages/` or update an existing one.
2. Ensure you add tests in `test/` directory of the package.
3. Run `bun test` to verify changes.
4. Run `bun run lint:fix` to ensure code style.
5. Commit and push.

## Deployment

Packages are designed to be published to a private registry or used via workspace protocols.

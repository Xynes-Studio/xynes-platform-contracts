# xynes-platform-contracts

A pure TypeScript library that defines the shared contracts (actions, errors, and types) for the Xynes platform. This library serves as the source of truth for communication between services.

## Overview

This library provides:

1.  **Base Action Contracts**: Standard types for internal action handlers and envelopes.
2.  **Error Hierarchy**: A unified `DomainError` system with standard HTTP-friendly subclasses (Validation, Not Found, Forbidden, etc.).
3.  **CMS Contracts**: Directory-first `cms.entry.*` payload/result types for dashboard authoring, plus legacy content-type contracts for compatibility flows.

It is designed to be:
-   **Framework Agnostic**: No bindings to Hono, Express, or any DB.
-   **Lightweight**: Only TypeScript definitions and error classes.

## Installation

```bash
pnpm add @xynes/platform-contracts
```

## Usage

### 1. Errors

Always use the standard error classes to ensure consistent error handling across the gateway and services.

```typescript
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  DomainError
} from '@xynes/platform-contracts';

// Throwing errors
function validateUser(input: any) {
  if (!input.email) {
    throw new ValidationError('Email is required', { field: 'email' });
  }
}

// Catching errors
try {
  validateUser({});
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(err.code); // 'VALIDATION_ERROR'
    console.log(err.details); // { field: 'email' }
  }
}
```

### 2. Actions

Use `ActionHandler` and `ActionRequestEnvelope` when implementing internal service endpoints.

```typescript
import { ActionHandler, ActionRequestEnvelope } from '@xynes/platform-contracts';

interface CreateDocPayload {
  title: string;
}

interface CreateDocResult {
  id: string;
}

// Define the handler
const createDoc: ActionHandler<CreateDocPayload, CreateDocResult> = async (payload, ctx) => {
  // logic...
  return { id: '123' };
};
```

### 3. CMS Contracts

- Directory-first authoring contracts are exported for `cms.entry.*` workflows:
  - `WorkspaceContentEntry`
  - `WorkspaceContentEntriesListPayload`
  - `WorkspaceContentEntriesListResult`
  - `WorkspaceContentEntryCreatePayload`
  - `WorkspaceContentEntryUpdatePayload`
- Legacy compatibility contracts remain exported for template/content-type flows:
  - `BlogEntry*` types
  - `CmsContentTypesListForWorkspace*` types

### 4. Workspace Admin Integrations (PFU-6)

The MVP allowlist of workspace API key preset keys is published from
`@xynes/platform-contracts` as the single source of truth shared between the
backend (`xynes-accounts-service`), the Workspace Admin UI
(`xynes-front-end/xynes-auth-app`), and the CMS console
(`xynes-front-end/xynes-cms-console-web`).

```typescript
import {
  WORKSPACE_API_KEY_PRESET_KEYS,
  isWorkspaceApiKeyPresetKey,
  type WorkspaceApiKeyPresetKey,
} from "@xynes/platform-contracts";

// Compile-time narrowing via the closed union.
const preset: WorkspaceApiKeyPresetKey = "cms_readonly";

// Runtime allowlist guard at the network boundary.
function parsePreset(input: unknown): WorkspaceApiKeyPresetKey {
  if (!isWorkspaceApiKeyPresetKey(input)) {
    throw new Error("INVALID_PRESET");
  }
  return input;
}
```

The preset → action-key scope mapping is server-only (it encodes authz
wiring) and lives in `xynes-accounts-service` as `WORKSPACE_API_KEY_PRESETS`.
Only the *list of keys* is part of this cross-package contract.

Each consumer keeps a small local mirror of `WORKSPACE_API_KEY_PRESET_KEYS`
plus a contract test that asserts parity, because the consumer repos do not
yet npm-link to this package directly. See
`xynes-platform-contracts/src/integrations/api-key-presets.ts` for the
canonical list and the per-repo `*-preset-keys.contract.test.ts` files for
the parity guards.

## Development

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

## Contributing

-   **Segregation**: Keep actions and errors in their respective folders.
-   **Testing**: Maintain >80% coverage.
-   **Standards**: Follow TDD and use standard ESLint rules.

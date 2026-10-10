# xynes-platform-contracts

A pure TypeScript library that defines the shared contracts (actions, errors, and types) for the Xynes platform. This library serves as the source of truth for communication between services.

## Overview

This library provides:

1.  **Base Action Contracts**: Standard types for internal action handlers and envelopes.
2.  **Error Hierarchy**: A unified `DomainError` system with standard HTTP-friendly subclasses (Validation, Not Found, Forbidden, etc.).
3.  **CMS Contracts**: Directory-first `cms.entry.*` payload/result types for dashboard authoring, plus legacy content-type contracts for compatibility flows.

It is designed to be:
-   **Framework Agnostic**: No bindings to Hono, Express, or any DB.
-   **Lightweight**: TypeScript definitions, error classes, and Zod validators.

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
function validateUser(input: { email?: string }) {
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

### 5. CMS delivery (CMS-INT-A1)

The versioned, snapshot-only delivery specification exports `CMS_DELIVERY_CONTRACT`, strict request/response schemas and inferred DTOs. The JSON artifact and SHA-256 digest support consumers that keep a checked-in mirror. See [the contract guide](docs/cms-delivery-contract.md) for routes, bounds, publication semantics, fixtures and handoff requirements. Schemas use `zod/v3` for a stable runtime/type API with Zod 3 and 4 peers; use that subpath when composing them. This package does not enable endpoints or grant scopes.

## Development

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
pnpm test:coverage
pnpm test:peers
pnpm lint
pnpm typecheck
pnpm contracts:check
```

## Contributing

-   **Segregation**: Keep actions and errors in their respective folders.
-   **Testing**: Maintain >80% coverage.
-   **Standards**: Follow TDD and use standard ESLint rules.

## Bound internal requests

`src/security/internal-request.ts` is the canonical Ed25519 request protocol and
explicit receiver/caller capability policy. Edit it here, run
`corepack pnpm internal-request:export`, then `corepack pnpm internal-request:check`
from this checkout with all backend sibling repositories present. Seven runtime
mirrors and six crypto suites across five consumers are generated, checked and committed in
their owning repositories. Receiver catalog tests protect production action parity.
The full contract coverage gate and each receiver's tests validate consumption
with its installed Zod version. Coordinate all seven runtime deployments with
owner-only signing mounts and receiver-specific public trust files; see infra's
`infra/release/INTERNAL-REQUEST-IDENTITIES.md`. No shared-token fallback remains.


### CMS compound publication policy

`cmsPublicationPermissions(actionKey, payload)` projects the additional publish/withdraw permissions for supported CMS compound effects. It strictly rejects non-boolean controls, conflicting metadata flags, invalid timestamps and non-string statuses; complete payload schemas remain service-owned. The gateway resolves permissions from the exact merged payload before signing, and CMS checks them before mutation. Approvals are bounded inside the existing signed body, never a client scope header.

Run `pnpm cms-policy:export` after changing the canonical implementation or `src/tests/cms-publication-policy.test.ts`. It exports exact implementation and native Bun test mirrors into gateway and CMS. `pnpm cms-policy:check` requires those sibling checkouts and detects drift without rewriting. Each consumer runs the canonical contract cases in its ordinary test suite; the exporter has its own drift/refusal regression tests. This contract does not modify role grants or older keys. See infra `docs/deployment/cms-integration-policy.md` for compatibility order and pending policy decisions.

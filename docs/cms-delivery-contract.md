# CMS delivery contract v1 — CMS-INT-A1

This story freezes the shared specification and validators. It does not register routes, implement snapshots, grant API-key scopes or enable the CMS integration UI. CMS-INT-A2 through A5 supply and verify those behaviours. The existing authoring and legacy public APIs retain their contracts; legacy public reads do not inherit this snapshot guarantee.

## Operations and publication semantics

| Action | Method and workspace-relative path | Payload |
| --- | --- | --- |
| `cms.delivery.listByDirectory` | GET `/workspaces/:workspaceId/delivery/entries` | Required `directoryId` UUID; list options below |
| `cms.delivery.getById` | GET `/workspaces/:workspaceId/delivery/entries/:entryId` | Required `entryId` UUID; optional `fields` |

Both routes are private and workspace-scoped, targeting `cms-core` at `/internal/cms-actions`. Access requires an authorized user or a workspace read-only key with the appropriate action scope. Metadata is not authorization or deployment readiness. The scope mapping remains server-only; key lifecycle remains in Workspace Admin.

Delivery serves the last validated publication snapshot. Saving a draft, including a title/body/folder edit, must not alter that publication; republishing replaces it atomically. Folder feeds use the published folder identity and include direct children only. Root/missing/null directory IDs are invalid. Archive, unpublish and delete hide retained snapshots immediately. Missing/malformed snapshots, including legacy published rows, have no current-data fallback: explicit republish is the recovery path. A2 owns validation, atomic persistence and live availability predicates; A3 owns delivery reads.

## Inputs

| List option | Allowed values | Default |
| --- | --- | --- |
| `sortBy` | `publishedAt`, `title` | `publishedAt` |
| `sortDirection` | `asc`, `desc` | `desc` |
| `limit` | Integer 1–100 | 20 |
| `offset` | Integer 0–10,000 | 0 |
| `search` | Optional trimmed 1–200 characters | Omitted |
| `fields` | Unique allowed names in CSV, maximum 128 characters | All list fields |

Search matches published title/description literally; A3 must escape SQL wildcard characters. Date ordering uses publishedAt then ID; title ordering uses title, publishedAt then ID. Offset pagination can shift during concurrent publication; cursor pagination and full export are deferred. Entry requests do not accept list options. Workspace identity comes from authenticated gateway context, never caller payload.

`fields` allows `id,title,description,tags,publishedAt`; detail additionally allows `body`. Trimmed names retain requested order, with ID first and always present. Empty, duplicate, dotted, unknown and forbidden names fail validation. The 128-character raw bound comfortably covers the longest valid six-field selector (42 characters) with modest spacing, while bounding parser work. Array selectors and over-posted properties are invalid. Projections omit unselected fields rather than returning null placeholders.

The exported `*Payload` types describe **input**: optional defaults and CSV fields. `*Options` describe **parsed output**: populated defaults and an array of validated fields. These schemas validate internal action payloads; they deliberately reject numeric strings. The HTTP adapter must safely coerce query integers and reject repeated/ambiguous parameters. Real HTTP coercion and scope tests belong to A4/A5, not this package's typed payload tests.

```typescript
import {
  CmsDeliveryDirectoryPayloadSchema,
  type CmsDeliveryDirectoryOptions,
} from '@xynes/platform-contracts';

const options: CmsDeliveryDirectoryOptions = CmsDeliveryDirectoryPayloadSchema.parse({
  directoryId: '22222222-2222-4222-8222-222222222222',
  fields: 'title,tags',
});
// options.fields = ['id', 'title', 'tags']; limit = 20; offset = 0.
```

## DTOs and envelopes

Publication summaries require a UUID ID, trimmed title of 1–200 characters, description of at most 4,000 characters, at most 50 trimmed tags of 1–80 characters, and an ISO publication timestamp with timezone. Limits prevent summary-only pages of 100 entries growing toward the 1 MiB per-entry snapshot budget. No truncation is permitted at publication time.

`CmsDeliveryPublicationSummarySchema` requires the full summary. `CmsDeliveryListItemSchema` requires ID and permits projection of other summary fields. `CmsDeliveryEntrySchema` additionally permits a JSON object or null body. JSON values may contain nested objects/arrays and finite numbers; a root array, HTML string, function or undefined value is invalid. All DTOs reject extra top-level properties: no raw `data`, audit/user fields, collaborators or favourites.

The body schema validates JSON structure, not supported editor nodes, asset visibility or public storage references. A2 must sanitize supported editor content, reject private/transient asset URLs, enforce a proposed **1 MiB UTF-8 serialized full DTO** cap before commit, and measure representative supported editor fixtures. This package publishes the budget; the recursive JSON schema does not enforce byte size, recursion depth or handle cyclic JavaScript objects. Use it on bounded wire JSON or sanitized publication data. A3 must query bounded summaries without materializing bodies, regardless of projection.

Responses retain the platform `ApiSuccess` envelope and optional `{requestId}` metadata:

```json
{"ok":true,"data":{"items":[],"page":{"limit":20,"offset":0,"hasMore":false}}}
```

```json
{"ok":true,"data":{"entry":{"id":"11111111-1111-4111-8111-111111111111","title":"Harmless publication"}}}
```

List responses contain at most the requested limit. `hasMore` comes from a bounded limit+1 query; there is no invented total. Invalid inputs use HTTP 400 / `VALIDATION_ERROR`. Missing, unpublished, deleted or cross-workspace entries use HTTP 404 / `ENTRY_NOT_FOUND` and the same generic message, `Published content unavailable`, without revealing existence. The error schema describes delivery's safe 400/404 examples; authentication, scope denials and transient failures retain the gateway's general `ApiError` contract. Errors must not become fabricated successes.

Authoring `WorkspaceContentEntry.deliveryState` is optional for compatibility and accepts `available`, `unpublished`, `republish_required`. A2 must derive it from the same snapshot validator and live predicates as delivery. A missing field means unknown to UI consumers; `unknown` is not a wire value. State describes publication availability, not scope or deployment readiness.

## Deterministic artifact and consumer handoff

`CMS_DELIVERY_CONTRACT` is recursively frozen metadata, shared by runtime validators and the JSON exporter. The public module uses Zod and no Node, database or UI APIs. Export tooling alone uses Node built-ins; no new runtime dependencies or environment variables are needed. The Zod 3 peer floor is the verified 3.25.76 release (also the development dependency floor). Consumers on older Zod 3 must upgrade before adopting these package exports; the JSON artifact has no runtime dependency. A pinned development-only `zod4` alias (`npm:zod@4.4.3`) supplies repeatable peer compatibility tests, not application runtime code.

```bash
pnpm contracts:export   # Intentional regeneration from reviewed source
pnpm contracts:check    # Read-only comparison; nonzero on missing files or byte drift
pnpm test
pnpm test:coverage     # >=80% statements/branches/functions/lines for each source file
pnpm test:peers        # Same built package typechecked and run with both installed peers
pnpm lint
pnpm typecheck
pnpm build
```

`contracts/cms-delivery.v1.json` uses two-space JSON plus a final newline. `contracts/cms-delivery.v1.sha256` hashes those exact UTF-8 bytes, lowercase hex plus newline. Check mode does not rewrite artifacts or heal their digests. Tool builds stay in ignored `.contract-tools/`; the package build retains `dist/index.js` and `dist/index.d.ts`.

`contracts/fixtures/cms-delivery/` contains fictitious IDs and harmless default/projected/empty/400/404 examples validated by the actual schemas. No credential values, real workspace content or preset-to-scope mapping is exported. Agent B can copy the artifact and fixtures into its generated mirror and pin the reviewed platform-contracts Git revision and digest. A consumer parity test must compare against that pinned artifact; publishing an npm package is unnecessary for this handoff. Changes after the freeze require version/fixture review by both delivery and UI owners.

## Validation and remaining work

TDD observed missing-contract and missing-export failures before implementation. Tests cover defaults, boundary rejection, CSV projections, forbidden DTO fields, JSON/envelope shapes, optional authoring compatibility, digest parity, missing/drifted exports and filesystem failures. The package enforces the 80% gate per file. The compiled CLI must also be exercised for valid checks and nonzero invalid/drift exits.

There are no database, migration, permission, deployment or credential changes in A1. The existing generic `ActionKey = string` and `skipLibCheck: true` remain compatibility debt outside this closed delivery union; no new type bypasses or relaxed checks were added. Runtime readiness, representative snapshot sizing, actual snapshot isolation and authenticated gateway integration remain A2–A5 acceptance work. Before B freezes its mirror, both owners must review this artifact and fixture handoff.

### Zod API and emitted compatibility

Delivery schemas import the versioned `zod/v3` API, available in both supported Zod package ranges (`^3.25.76 || ^4.0.0`). Runtime validation and emitted declarations therefore refer to the same schema API regardless of the consumer's installed root Zod version. This follows [Zod's library-author guidance on versioned subpaths](https://zod.dev/library-authors). The route/options/DTO contract, JSON artifact and SHA-256 digest are unchanged by this compatibility fix.

Consumers can call exported `.parse`/`.safeParse` methods directly. To compose these schemas or perform class-based checks, import Zod from **`zod/v3`**, even when the installed package is Zod 4. Do not compose them with root Zod 4 schema classes or check errors against root Zod 4's `ZodError`; the schema APIs are distinct. For example:

```typescript
import { z } from 'zod/v3';
import { CmsDeliveryEntrySchema } from '@xynes/platform-contracts';
const response = z.object({ entry: CmsDeliveryEntrySchema });
```

The platform's `formatZodError` and `createValidationErrorResponse` helpers accept `ZodErrorLike`, a readonly structural issue shape shared by Zod 3 and 4. Existing callers can pass either their root Zod errors or delivery schema errors. Normal string/number paths, messages, codes and the platform envelope retain their behaviour. Symbol path segments become the constant `[symbol]` in a copied path; symbol descriptions are not exposed, and the original error is not mutated. The helpers do not require a specific Zod error class.

### A1 verification evidence (2026-10-01)

The initial pre-PR review found a real blocker: declarations built with root Zod 3 referenced Zod 3-specific types through an unversioned `zod` import, so a supported Zod 4 consumer failed library checking. After changing the delivery import to `zod/v3`, the new test also caught an incompatible envelope-helper error parameter. Both failures were observed before their fixes. A separate failing test verified the JSON-safe symbol path requirement before implementation.

The blocker is **resolved**. `scripts/tests/cms-delivery-peers.test.ts` builds the actual production configuration once, copies the same output to isolated consumers using Zod 3.25.76 and the pinned Zod 4.4.3 alias, typechecks with `strict: true` and **`skipLibCheck: false`**, then runs each compiled consumer. The fixture imports the package root, checks typed defaults/projections/DTOs without `any`, composes a schema through `zod/v3`, and exercises both delivery errors and the consumer's root-Zod errors through the existing envelope helpers. This runs in the normal test and coverage suites and via `pnpm test:peers`. Temporary builds are cleaned up; no sibling checkout or network is required during tests.

All **93 tests** pass. Coverage is **100%** for `cms-delivery.ts`, `envelope.ts`, `cms-actions.ts` and `index.ts`; the Node exporter has **87.5%** lines/statements, **93.33%** branches and **100%** functions. Overall lines/statements are **99.37%**, branches **98.21%**, functions **100%**. Every source file meets the configured 80% gate. Lint, typecheck, build and deterministic artifact check pass. The compiled CLI's earlier success/drift/missing-file checks remain covered by exporter tests.

An additional disposable source cohort with Zod 4 as the root dependency passes package/tools typecheck and all 93 tests. The old envelope `PropertyKey[]` type failure is removed by the shared error shape; legacy formatter tests now assert preservation of the supplied issues instead of a Zod 3-specific vocabulary. No type skips, unsafe casts or reduced compiler checks were introduced. Existing generic `ActionKey = string` and the repository's original `skipLibCheck: true` configuration remain unchanged; consumer regression checks explicitly disable the latter.

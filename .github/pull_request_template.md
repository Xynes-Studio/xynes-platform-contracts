## Summary
<!-- One-paragraph description of what this PR does and why. -->

## Linked work
- Plan / issue: <!-- link -->
- Related repos: <!-- link any PRs that depend on or are depended on by this one -->

## Quality gates
- [ ] `lint` passes locally
- [ ] `test` passes locally
- [ ] Coverage ≥ ADR-001 80% floor (or justified exception below)
- [ ] `typecheck` / `build` passes (where applicable)
- [ ] Docs updated (`README.md`, `DEVELOPER.md`, `AGENTS.md`, repo memory)
- [ ] Migration added (if schema change) — forward-only, expand/contract
- [ ] QA PII scrub updated (if migration adds PII)
- [ ] Release doc set updated (if release contract changed)

## Security
- [ ] No secrets in code, logs, error messages, or test fixtures
- [ ] No raw API keys forwarded to downstream services
- [ ] No PII added to telemetry or access logs

## Deployment notes
<!-- e.g. "Requires migration run before service rollout", "Requires xynes-platform-contracts vX.Y.Z first". -->

## Rollback plan
<!-- For risky changes only. -->

---

## Repo-specific items (xynes-platform-contracts)

This is the **TypeScript-only shared contracts** package consumed by every service and the FE SDK. It has **no runtime, no DB, no HTTP** — just typed action envelopes, error codes, and integration types (e.g. `WORKSPACE_API_KEY_PRESET_KEYS` from PFU-6).

- [ ] Lint: `bun run lint` (eslint over all `.ts` files)
- [ ] Tests: `bun run test` (vitest run)
- [ ] Build: `bun run build` (`tsc -p tsconfig.json`) — every PR MUST verify `dist/` rebuilds cleanly because every consumer (`xynes-gateway`, `xynes-accounts-service`, `xynes-auth-sdk`, etc.) imports from this package's published types.
- [ ] **Cross-package contract changes MUST land here FIRST** (per PFU-6 precedent: closed-set `WorkspaceApiKeyPresetKey` union + `isWorkspaceApiKeyPresetKey` guard). Consumers in `xynes-accounts-service`, `xynes-auth-app`, and `xynes-cms-console-web` each keep a local mirror plus a `*-preset-keys.contract.test.ts` parity guard. Adding a new contract entry requires updating: (1) this package's canonical export; (2) every consumer's mirror; (3) every consumer's parity test. Without lockstep updates, the parity guards will fail in CI.
- [ ] **Action envelope shape is frozen.** Changes to `envelope.ts` (the `{ ok, data, meta }` discriminated envelope) MUST be backwards-compatible — every FE client uses `unwrapGatewayEnvelope`, and a breaking shape change would brick every gateway-reachable action across the entire workspace. If a breaking change is genuinely needed, file a separate epic plan first.
- [ ] **Closed-set error codes only.** New `errors/*` entries land as additions to the existing closed-set unions. The closed-set posture is what lets the gateway redaction + every consumer parser stay safe — a free-form string would defeat both.
- [ ] **No runtime dependencies.** This package compiles to types + minimal runtime helpers (envelope builders, type guards). PRs that add a heavy runtime dep (HTTP client, DB client, secret manager) belong in a service, not here.
- [ ] No raw credentials in any test fixture or contract. No `xynes_live_*` / `AKIA*` / `re_*` / `X-Amz-Signature` substrings anywhere.

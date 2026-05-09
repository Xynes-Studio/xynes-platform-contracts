/**
 * Workspace Admin Integrations — API key preset keys (canonical contract).
 *
 * The list of supported MVP `presetKey` values is the *contract* between:
 *
 *  - The **backend** (`xynes-accounts-service`), which maps each preset to a
 *    curated set of action-key scopes that the API key is allowed to invoke
 *    (see `WORKSPACE_API_KEY_PRESETS` in `xynes-accounts-service`). The
 *    preset → scope map is server-only because it encodes authz wiring; only
 *    the **list of keys** is part of this cross-package contract.
 *  - The **Workspace Admin UI** (`xynes-front-end/xynes-auth-app`), which
 *    fail-closes on unknown presets *before* the network call so a typo
 *    cannot reach the gateway.
 *  - The **CMS console** (`xynes-front-end/xynes-cms-console-web`), which
 *    builds deep-link URLs with `?preset=<key>` query parameters that are
 *    interpreted by the Workspace Admin UI.
 *
 * Each consumer historically maintained its own copy of this list. Divergence
 * is fail-closed (any unknown preset is rejected before the network), but is
 * still maintenance friction. PFU-6 promotes this list to
 * `@xynes/platform-contracts` as the canonical source.
 *
 * Note on distribution: `xynes-platform-contracts` is currently a contract
 * *spec* package; consumers in this monorepo do not yet npm-link to it
 * directly. Each consumer keeps a small local mirror plus a stability test
 * that imports from this canonical list (or re-asserts the same set when the
 * package is not on the resolution path) — see the per-repo
 * `*-preset-keys.contract.test.ts` files.
 *
 * Adding a new preset:
 *   1. Append the key to `WORKSPACE_API_KEY_PRESET_KEYS` below.
 *   2. Add the preset → scope mapping in `xynes-accounts-service`'s
 *      `WORKSPACE_API_KEY_PRESETS`.
 *   3. Mirror the new key in each consumer's local copy (the contract tests
 *      will fail until you do).
 *   4. Update consumer UI labels (preset Select / link copy) where relevant.
 *
 * Renaming or removing a preset is a *breaking* contract change. Existing
 * API keys stamped with the old preset key remain in the database and must
 * be migrated explicitly. Don't rename without an ADR.
 */

/**
 * The closed set of supported workspace API key preset keys (MVP).
 *
 * Order is informational and matches the order presented in the create-API-key
 * UI Select. Tests assert the *set* equality, not the order, but consumers
 * that copy this list should preserve order for UI parity.
 */
export const WORKSPACE_API_KEY_PRESET_KEYS = [
  "cms_readonly",
  "cms_authoring",
  "cms_publisher",
  "telemetry_read",
  "workspace_admin",
] as const;

/**
 * Discriminated string type for a recognized workspace API key preset.
 *
 * Consumers should prefer this type in handler signatures, validators, and
 * URL builders; only narrow widening to `string` at the network boundary
 * where unknown upstream input has to be revalidated against the allowlist
 * regardless.
 */
export type WorkspaceApiKeyPresetKey =
  (typeof WORKSPACE_API_KEY_PRESET_KEYS)[number];

/**
 * Type guard. Use this at the network boundary to coerce an arbitrary
 * upstream string into the closed `WorkspaceApiKeyPresetKey` union without
 * widening the rest of the codebase to `string`.
 *
 * Returning `false` is the secure default: callers should reject the input
 * with their domain's `INVALID_PRESET` error rather than letting it fall
 * through to the network or the database.
 */
export function isWorkspaceApiKeyPresetKey(
  candidate: unknown,
): candidate is WorkspaceApiKeyPresetKey {
  return (
    typeof candidate === "string" &&
    (WORKSPACE_API_KEY_PRESET_KEYS as ReadonlyArray<string>).includes(candidate)
  );
}

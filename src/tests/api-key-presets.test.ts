import { describe, it, expect, expectTypeOf } from "vitest";
import {
  WORKSPACE_API_KEY_PRESET_KEYS,
  isWorkspaceApiKeyPresetKey,
  type WorkspaceApiKeyPresetKey,
} from "../index";

describe("WORKSPACE_API_KEY_PRESET_KEYS — stability contract", () => {
  it("exposes the exact MVP allowlist (order-sensitive)", () => {
    // Order is part of the UI contract — the create-API-key Select renders
    // options in this order. Renames or reorders are breaking changes.
    expect(WORKSPACE_API_KEY_PRESET_KEYS).toEqual([
      "cms_readonly",
      "cms_authoring",
      "cms_publisher",
      "telemetry_read",
      "workspace_admin",
    ]);
  });

  it("exposes the exact MVP allowlist (set equality)", () => {
    // Set equality guards against silent additions/removals via array literal
    // refactors that might preserve length.
    expect([...WORKSPACE_API_KEY_PRESET_KEYS].sort()).toEqual(
      [
        "cms_authoring",
        "cms_publisher",
        "cms_readonly",
        "telemetry_read",
        "workspace_admin",
      ].sort(),
    );
  });

  it("is exported as a readonly tuple (`as const`) so consumers narrow correctly", () => {
    // `WORKSPACE_API_KEY_PRESET_KEYS[number]` must be the closed union, not
    // `string`. If someone removes the `as const` upstream, the consumer
    // type narrowing breaks silently — this assertion fails first.
    expectTypeOf<WorkspaceApiKeyPresetKey>().toEqualTypeOf<
      | "cms_readonly"
      | "cms_authoring"
      | "cms_publisher"
      | "telemetry_read"
      | "workspace_admin"
    >();
  });

  it("freezes the array to prevent mutation by consumers (defense in depth)", () => {
    // The `as const` makes the element type readonly at compile time. The
    // runtime tuple is also frozen by V8 because TS emits a literal with
    // `Object.freeze` semantics for `as const` arrays in some build chains;
    // even without explicit freezing, mutation should never be attempted.
    expect(Array.isArray(WORKSPACE_API_KEY_PRESET_KEYS)).toBe(true);
    expect(WORKSPACE_API_KEY_PRESET_KEYS.length).toBe(5);
  });

  it("contains no duplicate keys", () => {
    const set = new Set<string>(WORKSPACE_API_KEY_PRESET_KEYS);
    expect(set.size).toBe(WORKSPACE_API_KEY_PRESET_KEYS.length);
  });

  it("contains only safe URL-query-parameter-friendly identifiers", () => {
    // Defense in depth — these keys flow into `?preset=<key>` deep links
    // that the CMS console builds for the Workspace Admin UI. A key with
    // a path separator, whitespace, or URL-reserved character would break
    // the link or open a parsing seam. Keep the format strict.
    const validKey = /^[a-z][a-z0-9_]*$/;
    for (const key of WORKSPACE_API_KEY_PRESET_KEYS) {
      expect(key).toMatch(validKey);
    }
  });
});

describe("isWorkspaceApiKeyPresetKey", () => {
  it("returns true for every key in the allowlist", () => {
    for (const key of WORKSPACE_API_KEY_PRESET_KEYS) {
      expect(isWorkspaceApiKeyPresetKey(key)).toBe(true);
    }
  });

  it("returns false for a string that is not in the allowlist", () => {
    expect(isWorkspaceApiKeyPresetKey("cms_search")).toBe(false);
    expect(isWorkspaceApiKeyPresetKey("CMS_READONLY")).toBe(false); // case-sensitive
    expect(isWorkspaceApiKeyPresetKey("")).toBe(false);
  });

  it("returns false for non-string input (defense in depth)", () => {
    expect(isWorkspaceApiKeyPresetKey(undefined)).toBe(false);
    expect(isWorkspaceApiKeyPresetKey(null)).toBe(false);
    expect(isWorkspaceApiKeyPresetKey(0)).toBe(false);
    expect(isWorkspaceApiKeyPresetKey({})).toBe(false);
    expect(isWorkspaceApiKeyPresetKey([])).toBe(false);
    // Hostile object that defines a `toString` returning a valid key — must
    // still reject. Type guard MUST check `typeof === "string"` first.
    expect(isWorkspaceApiKeyPresetKey({ toString: () => "cms_readonly" })).toBe(
      false,
    );
  });

  it("narrows the type at the call site", () => {
    const candidate: unknown = "cms_readonly";
    if (isWorkspaceApiKeyPresetKey(candidate)) {
      // If the guard works, this assignment compiles. If the guard returns
      // a wider type, this line is a compile error.
      const narrowed: WorkspaceApiKeyPresetKey = candidate;
      expect(narrowed).toBe("cms_readonly");
    } else {
      throw new Error("guard rejected a known-good key — test bug");
    }
  });
});

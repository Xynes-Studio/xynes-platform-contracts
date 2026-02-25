import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  signInternalJwt,
  mapServiceKeyToAudience,
  type InternalJwtPayload,
} from "../security/internal-jwt";

/**
 * Helper to decode base64url without padding
 */
function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + "=".repeat(padLen), "base64");
}

/**
 * Parse a JWT and return header and payload
 */
function parseJwt(token: string): { header: Record<string, unknown>; payload: InternalJwtPayload } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  
  try {
    const header = JSON.parse(base64UrlDecode(parts[0]!).toString("utf8"));
    const payload = JSON.parse(base64UrlDecode(parts[1]!).toString("utf8"));
    return { header, payload };
  } catch {
    return null;
  }
}

describe("signInternalJwt", () => {
  const TEST_SIGNING_KEY = "test-signing-key-for-unit-tests";
  const now = Math.floor(Date.now() / 1000);

  it("creates a valid JWT with correct structure", () => {
    const token = signInternalJwt(TEST_SIGNING_KEY, {
      issuer: "gateway-service",
      audience: "doc-service",
      requestId: "req-test-123",
      nowEpochSeconds: now,
    });

    expect(token).toBeDefined();
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
  });

  it("includes correct header with HS256 algorithm", () => {
    const token = signInternalJwt(TEST_SIGNING_KEY, {
      issuer: "gateway-service",
      audience: "doc-service",
      requestId: "req-test-123",
    });

    const parsed = parseJwt(token);
    expect(parsed).not.toBeNull();
    expect(parsed!.header.alg).toBe("HS256");
    expect(parsed!.header.typ).toBe("JWT");
  });

  it("includes correct payload with all required fields", () => {
    const token = signInternalJwt(TEST_SIGNING_KEY, {
      issuer: "gateway-service",
      audience: "doc-service",
      requestId: "req-test-123",
      nowEpochSeconds: now,
    });

    const parsed = parseJwt(token);
    expect(parsed).not.toBeNull();
    expect(parsed!.payload.iss).toBe("gateway-service");
    expect(parsed!.payload.aud).toBe("doc-service");
    expect(parsed!.payload.iat).toBe(now);
    expect(parsed!.payload.exp).toBe(now + 60); // default TTL
    expect(parsed!.payload.internal).toBe(true);
    expect(parsed!.payload.requestId).toBe("req-test-123");
  });

  it("uses custom TTL when provided", () => {
    const token = signInternalJwt(TEST_SIGNING_KEY, {
      issuer: "gateway-service",
      audience: "authz-service",
      requestId: "req-custom-ttl",
      ttlSeconds: 120,
      nowEpochSeconds: now,
    });

    const parsed = parseJwt(token);
    expect(parsed!.payload.exp).toBe(now + 120);
  });

  it("creates verifiable signature", () => {
    const token = signInternalJwt(TEST_SIGNING_KEY, {
      issuer: "gateway-service",
      audience: "cms-service",
      requestId: "req-verify",
      nowEpochSeconds: now,
    });

    const parts = token.split(".");
    const signingInput = `${parts[0]}.${parts[1]}`;
    const expectedSignature = createHmac("sha256", TEST_SIGNING_KEY)
      .update(signingInput)
      .digest()
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    expect(parts[2]).toBe(expectedSignature);
  });

  it("generates different tokens for different audiences", () => {
    const token1 = signInternalJwt(TEST_SIGNING_KEY, {
      issuer: "gateway-service",
      audience: "doc-service",
      requestId: "req-1",
      nowEpochSeconds: now,
    });

    const token2 = signInternalJwt(TEST_SIGNING_KEY, {
      issuer: "gateway-service",
      audience: "authz-service",
      requestId: "req-1",
      nowEpochSeconds: now,
    });

    expect(token1).not.toBe(token2);
  });
});

describe("mapServiceKeyToAudience", () => {
  it("maps 'docs' to 'doc-service'", () => {
    expect(mapServiceKeyToAudience("docs")).toBe("doc-service");
  });

  it("maps 'doc-service' to 'doc-service'", () => {
    expect(mapServiceKeyToAudience("doc-service")).toBe("doc-service");
  });

  it("maps 'cms' to 'cms-service'", () => {
    expect(mapServiceKeyToAudience("cms")).toBe("cms-service");
  });

  it("maps 'cms-core' to 'cms-service'", () => {
    expect(mapServiceKeyToAudience("cms-core")).toBe("cms-service");
  });

  it("maps 'authz' to 'authz-service'", () => {
    expect(mapServiceKeyToAudience("authz")).toBe("authz-service");
  });

  it("maps 'telemetry' to 'telemetry-service'", () => {
    expect(mapServiceKeyToAudience("telemetry")).toBe("telemetry-service");
  });

  it("maps 'accounts' to 'accounts-service'", () => {
    expect(mapServiceKeyToAudience("accounts")).toBe("accounts-service");
  });

  it("maps 'gateway' to 'gateway-service'", () => {
    expect(mapServiceKeyToAudience("gateway")).toBe("gateway-service");
  });

  it("returns null for unknown service keys", () => {
    expect(mapServiceKeyToAudience("unknown")).toBeNull();
    expect(mapServiceKeyToAudience("")).toBeNull();
    expect(mapServiceKeyToAudience("random-service")).toBeNull();
  });
});

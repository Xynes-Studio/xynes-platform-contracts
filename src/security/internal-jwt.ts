/**
 * SEC-INTERNAL-AUTH-2: Shared Internal JWT Types and Utilities
 *
 * This module provides shared types and utilities for internal JWT authentication
 * across all Xynes platform services.
 *
 * Security considerations:
 * - Uses HS256 with timing-safe comparison
 * - Short token TTL (60s default) to limit replay window
 * - Audience claim prevents token reuse across services
 * - Issuer claim identifies the originating service
 * - Token values are NEVER logged
 */

import { createHmac } from "node:crypto";

/**
 * Service keys for internal service identification.
 * All services in the platform that may participate in internal JWT authentication.
 */
export type ServiceKey =
  | "gateway-service"
  | "doc-service"
  | "cms-service"
  | "authz-service"
  | "telemetry-service"
  | "accounts-service";

/**
 * Internal JWT payload structure for service-to-service authentication.
 */
export interface InternalJwtPayload {
  /** Target service (audience) - who can accept this token */
  aud: ServiceKey;
  /** Issuing service - who created this token */
  iss: ServiceKey;
  /** Issued at timestamp (epoch seconds) */
  iat: number;
  /** Expiration timestamp (epoch seconds) */
  exp: number;
  /** Internal marker to distinguish from user JWTs */
  internal: true;
  /** Request correlation ID for tracing */
  requestId: string;
}

/**
 * Options for signing an internal JWT.
 */
export interface SignInternalJwtOptions {
  /** Issuing service key (who is creating this token) */
  issuer: ServiceKey;
  /** Target service key (who should accept this token) */
  audience: ServiceKey;
  /** Request correlation ID */
  requestId: string;
  /** TTL in seconds (default: 60) */
  ttlSeconds?: number;
  /** Override current time for testing (epoch seconds) */
  nowEpochSeconds?: number;
}

/**
 * Base64url encode a buffer without padding.
 */
function base64UrlEncode(data: Buffer | string): string {
  const buffer = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/**
 * Sign an internal JWT for service-to-service communication.
 *
 * @param signingKey - The INTERNAL_JWT_SIGNING_KEY secret
 * @param options - Signing options including issuer, audience, and request ID
 * @returns Signed JWT string
 *
 * @example
 * ```ts
 * const token = signInternalJwt(process.env.INTERNAL_JWT_SIGNING_KEY!, {
 *   issuer: 'gateway-service',
 *   audience: 'doc-service',
 *   requestId: 'req-abc123',
 * });
 * headers.set('X-Internal-Service-Token', token);
 * ```
 */
export function signInternalJwt(
  signingKey: string,
  options: SignInternalJwtOptions
): string {
  const ttl = options.ttlSeconds ?? 60;
  const now = options.nowEpochSeconds ?? Math.floor(Date.now() / 1000);

  const payload: InternalJwtPayload = {
    iss: options.issuer,
    aud: options.audience,
    iat: now,
    exp: now + ttl,
    internal: true,
    requestId: options.requestId,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", signingKey)
    .update(signingInput)
    .digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${signingInput}.${encodedSignature}`;
}

/**
 * Maps route service keys to internal JWT service identifiers.
 * This ensures consistent naming across the platform.
 */
export function mapServiceKeyToAudience(serviceKey: string): ServiceKey | null {
  const mapping: Record<string, ServiceKey> = {
    gateway: "gateway-service",
    "gateway-service": "gateway-service",
    docs: "doc-service",
    "doc-service": "doc-service",
    cms: "cms-service",
    "cms-core": "cms-service",
    "cms-service": "cms-service",
    authz: "authz-service",
    "authz-service": "authz-service",
    telemetry: "telemetry-service",
    "telemetry-service": "telemetry-service",
    accounts: "accounts-service",
    "accounts-service": "accounts-service",
  };
  return mapping[serviceKey] ?? null;
}

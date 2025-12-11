export interface DomainErrorOptions {
  cause?: unknown;
  details?: unknown;
}

/**
 * Base class for all domain-level errors in the platform.
 *
 * - `code` is a stable machine-readable identifier (e.g. "VALIDATION_ERROR").
 * - `message` is human-readable.
 * - `details` can carry structured info (field-level errors, etc.).
 */
export class DomainError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  public readonly cause?: unknown;

  constructor(code: string, message: string, options: DomainErrorOptions = {}) {
    super(message);
    this.code = code;
    this.details = options.details;
    this.cause = options.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

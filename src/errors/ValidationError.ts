import { DomainError } from './DomainError';

export class ValidationError extends DomainError {
  constructor(message = 'Validation failed', details?: unknown) {
    super('VALIDATION_ERROR', message, { details });
  }
}

import { DomainError } from './DomainError';

export class ConflictError extends DomainError {
  constructor(message = 'Conflict', details?: unknown) {
    super('CONFLICT', message, { details });
  }
}

import { DomainError } from './DomainError';

export class InternalError extends DomainError {
  constructor(message = 'Internal error', details?: unknown) {
    super('INTERNAL_ERROR', message, { details });
  }
}

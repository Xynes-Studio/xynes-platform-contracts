import { DomainError } from './DomainError';

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden', details?: unknown) {
    super('FORBIDDEN', message, { details });
  }
}

import { DomainError } from './DomainError';

export class NotFoundError extends DomainError {
  constructor(resource: string, details?: unknown) {
    super('NOT_FOUND', `${resource} not found`, { details });
  }
}

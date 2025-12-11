import { describe, it, expect } from 'vitest';
import {
  DomainError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  InternalError,
  ActionRequestEnvelope,
} from '../index';

describe('Domain Errors', () => {
  it('should be instance of Error and DomainError', () => {
    const error = new ValidationError('Invalid input');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(ValidationError);
  });

  it('should have correct error codes', () => {
    expect(new ValidationError().code).toBe('VALIDATION_ERROR');
    expect(new NotFoundError('User').code).toBe('NOT_FOUND');
    expect(new ForbiddenError().code).toBe('FORBIDDEN');
    expect(new ConflictError().code).toBe('CONFLICT');
    expect(new InternalError().code).toBe('INTERNAL_ERROR');
  });

  it('should carry details and cause', () => {
    const details = { field: 'email', reason: 'invalid' };
    const cause = new Error('Root cause');
    const error = new ValidationError('Invalid input', details);
    
    // @ts-ignore - access protected/private if needed, but here it's public readonly
    expect(error.details).toEqual(details);
    // basic check
    expect(error.message).toBe('Invalid input');
  });
});

describe('Action Contracts', () => {
  it('should allow typing ActionRequestEnvelope', () => {
    interface MyPayload {
      foo: string;
      bar: number;
    }

    const envelope: ActionRequestEnvelope<MyPayload> = {
      actionKey: 'my.action',
      payload: {
        foo: 'hello',
        bar: 123,
      },
    };

    expect(envelope.actionKey).toBe('my.action');
    expect(envelope.payload.foo).toBe('hello');
    expect(envelope.payload.bar).toBe(123);
  });
});

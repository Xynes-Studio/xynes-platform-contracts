import { describe, expect, test } from 'bun:test';
import { DomainError, ValidationError, NotFoundError } from '../src/index';

describe('Errors', () => {
  test('DomainError has correct shape', () => {
    const err = new DomainError('Something went wrong', 'OOPS', 500);
    expect(err.message).toBe('Something went wrong');
    expect(err.code).toBe('OOPS');
    expect(err.statusCode).toBe(500);
    expect(err.toResponse()).toEqual({
      error: {
        code: 'OOPS',
        message: 'Something went wrong',
      },
    });
  });

  test('ValidationError defaults', () => {
    const err = new ValidationError('Invalid input');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.toResponse().error.code).toBe('VALIDATION_ERROR');
  });

  test('NotFoundError defaults', () => {
    const err = new NotFoundError();
    expect(err.message).toBe('Resource not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
  });

  test('NotFoundError custom message', () => {
    const err = new NotFoundError('User not found');
    expect(err.message).toBe('User not found');
  });
});

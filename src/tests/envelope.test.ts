import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse,
  formatZodError,
  createValidationErrorResponse,
  generateRequestId,
  ApiSuccess,
  ApiError,
} from '../envelope';

describe('Envelope Utilities', () => {
  describe('createSuccessResponse', () => {
    it('should create success response without requestId', () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse(data);

      expect(response).toEqual({
        ok: true,
        data: { id: '123', name: 'Test' },
      });
      expect(response.meta).toBeUndefined();
    });

    it('should create success response with requestId', () => {
      const data = { value: 42 };
      const response = createSuccessResponse(data, 'req-abc');

      expect(response).toEqual({
        ok: true,
        data: { value: 42 },
        meta: { requestId: 'req-abc' },
      });
    });

    it('should preserve data types', () => {
      interface User {
        id: string;
        email: string;
      }
      const user: User = { id: '1', email: 'test@example.com' };
      const response: ApiSuccess<User> = createSuccessResponse(user);

      expect(response.ok).toBe(true);
      expect(response.data.email).toBe('test@example.com');
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response without requestId', () => {
      const response = createErrorResponse('NOT_FOUND', 'Resource not found');

      expect(response).toEqual({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      });
      expect(response.meta).toBeUndefined();
    });

    it('should create error response with requestId', () => {
      const response = createErrorResponse('FORBIDDEN', 'Access denied', 'req-xyz');

      expect(response).toEqual({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
        meta: { requestId: 'req-xyz' },
      });
    });

    it('should include details when provided', () => {
      const details = {
        issues: [{ path: ['email'], message: 'Invalid email' }],
      };
      const response = createErrorResponse('VALIDATION_ERROR', 'Invalid input', 'req-1', details);

      expect(response.error.details).toEqual(details);
    });
  });

  describe('formatZodError', () => {
    it('should format simple Zod error', () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const result = schema.safeParse({ email: 'not-an-email' });
      if (result.success) throw new Error('Should fail');

      const formatted = formatZodError(result.error);

      expect(formatted.issues).toHaveLength(1);
      expect(formatted.issues![0].path).toEqual(['email']);
      expect(formatted.issues![0].code).toBe('invalid_string');
    });

    it('should format nested Zod error', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            age: z.number().min(18),
          }),
        }),
      });

      const result = schema.safeParse({ user: { profile: { age: 10 } } });
      if (result.success) throw new Error('Should fail');

      const formatted = formatZodError(result.error);

      expect(formatted.issues![0].path).toEqual(['user', 'profile', 'age']);
    });

    it('should format multiple errors', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number(),
      });

      const result = schema.safeParse({ name: '', age: 'not-a-number' });
      if (result.success) throw new Error('Should fail');

      const formatted = formatZodError(result.error);

      expect(formatted.issues!.length).toBeGreaterThan(1);
    });

    it('should include error messages', () => {
      const schema = z.object({
        type: z.string(),
      });

      const result = schema.safeParse({});
      if (result.success) throw new Error('Should fail');

      const formatted = formatZodError(result.error);

      expect(formatted.issues![0].message).toBe('Required');
      expect(formatted.issues![0].path).toEqual(['type']);
    });
  });

  describe('createValidationErrorResponse', () => {
    it('should create validation error with formatted Zod issues', () => {
      const schema = z.object({
        title: z.string().min(1),
      });

      const result = schema.safeParse({ title: '' });
      if (result.success) throw new Error('Should fail');

      const response = createValidationErrorResponse(result.error, 'req-validation');

      expect(response.ok).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.error.message).toBe('Payload validation failed');
      expect(response.error.details?.issues).toBeDefined();
      expect(response.meta?.requestId).toBe('req-validation');
    });

    it('should accept custom message', () => {
      const schema = z.object({ id: z.string().uuid() });
      const result = schema.safeParse({ id: 'bad' });
      if (result.success) throw new Error('Should fail');

      const response = createValidationErrorResponse(result.error, undefined, 'Custom validation message');

      expect(response.error.message).toBe('Custom validation message');
    });
  });

  describe('generateRequestId', () => {
    it('should generate a string starting with req-', () => {
      const id = generateRequestId();
      expect(id.startsWith('req-')).toBe(true);
    });

    it('should generate unique IDs on each call', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with expected format (3 parts separated by dashes)', () => {
      const id = generateRequestId();
      const parts = id.split('-');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('req');
    });
  });
});


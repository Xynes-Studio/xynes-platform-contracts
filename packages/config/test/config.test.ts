import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { createEnv } from '../src/index';

describe('Config', () => {
  test('createEnv validates valid input', () => {
    const schema = z.object({
      PORT: z.string(),
    });
    const env = createEnv(schema, { PORT: '3000' });
    expect(env.PORT).toBe('3000');
  });

  test('createEnv throws on invalid input', () => {
    const schema = z.object({
      PORT: z.string(),
    });
    expect(() => createEnv(schema, {})).toThrow('Invalid environment variables');
  });

  test('createEnv works with process.env (mocked)', () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv, FOO: 'bar' };

    const schema = z.object({
      FOO: z.string(),
    });

    try {
      const env = createEnv(schema);
      expect(env.FOO).toBe('bar');
    } finally {
      process.env = originalEnv;
    }
  });
});

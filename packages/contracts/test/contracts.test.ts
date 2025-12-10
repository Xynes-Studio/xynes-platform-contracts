import { describe, expect, test } from 'bun:test';
import { DocumentSchema } from '../src/schemas';

describe('Contracts', () => {
  test('DocumentSchema validates valid document', () => {
    const validDoc = {
      id: '123',
      workspaceId: 'ws-1',
      type: 'report',
      status: 'published',
      content: 'some content',
    };
    const result = DocumentSchema.safeParse(validDoc);
    expect(result.success).toBe(true);
  });

  test('DocumentSchema rejects invalid document', () => {
    const invalidDoc = {
      id: '123',
      workspaceId: 123, // invalid type
      type: 'report',
      status: 'unknown', // invalid enum
      content: 'some content',
    };
    const result = DocumentSchema.safeParse(invalidDoc);
    expect(result.success).toBe(false);
  });
});

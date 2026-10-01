import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as contracts from '../index';
import type { ApiSuccess, WorkspaceContentEntry } from '../index';

const directoryId = '22222222-2222-4222-8222-222222222222';
const entryId = '11111111-1111-4111-8111-111111111111';
const summary = {
  id: entryId, title: 'Harmless publication', description: 'Fixture summary',
  tags: ['fixture'], publishedAt: '2026-10-01T00:00:00.000Z',
};

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve('contracts/fixtures/cms-delivery', name), 'utf8'));
}

describe('CMS-INT-A1 delivery contract', () => {
  it('exports two private snapshot-backed operations', () => {
    expect(contracts).toHaveProperty('CMS_DELIVERY_CONTRACT', expect.objectContaining({
      version: 1, publication: 'snapshot', requiredField: 'id',
      auth: 'workspace_scoped_readonly_key_or_authorized_user',
    }));
    const { operations } = contracts.CMS_DELIVERY_CONTRACT;
    expect(Object.keys(operations)).toEqual(['directory', 'entry']);
    expect(operations.directory).toMatchObject({
      method: 'GET', path: '/workspaces/:workspaceId/delivery/entries',
      actionKey: 'cms.delivery.listByDirectory', requiredQuery: ['directoryId'],
      limit: { min: 1, max: 100, default: 20 },
      offset: { min: 0, max: 10000, default: 0 },
    });
    expect(operations.entry.path).toBe('/workspaces/:workspaceId/delivery/entries/:entryId');
    expect(operations.entry.actionKey).toBe('cms.delivery.getById');
    expect(contracts.CMS_DELIVERY_CONTRACT.route).toEqual({
      serviceKey: 'cms-core', targetPath: '/internal/cms-actions', workspaceScoped: true, isPublic: false,
    });
  });

  it('prevents runtime consumers changing nested bounds or fields', () => {
    const contract = contracts.CMS_DELIVERY_CONTRACT;
    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.operations.directory.fields)).toBe(true);
    expect(Reflect.set(contract.operations.directory.limit, 'max', 1000)).toBe(false);
    expect(Reflect.set(contract.operations.entry.fields, '0', 'createdBy')).toBe(false);
  });

  it('uses the actual runtime schemas for declared bounds, enums and field sets', () => {
    const c = contracts.CMS_DELIVERY_CONTRACT;
    const s = contracts.CmsDeliveryDirectoryPayloadSchema;
    const defaults = s.parse({ directoryId });
    expect(defaults).toEqual({ directoryId, sortBy: 'publishedAt', sortDirection: 'desc', limit: 20, offset: 0, fields: [...c.operations.directory.fields] });
    for (const sortBy of c.operations.directory.sortBy) {
      for (const sortDirection of c.operations.directory.sortDirection) {
        expect(s.parse({ directoryId, sortBy, sortDirection }).sortDirection).toBe(sortDirection);
      }
    }
    for (const name of ['limit', 'offset'] as const) {
      const bound = c.operations.directory[name];
      expect(s.safeParse({ directoryId, [name]: bound.min }).success).toBe(true);
      expect(s.safeParse({ directoryId, [name]: bound.max }).success).toBe(true);
      expect(s.safeParse({ directoryId, [name]: bound.min - 1 }).success).toBe(false);
      expect(s.safeParse({ directoryId, [name]: bound.max + 1 }).success).toBe(false);
    }
    expect(s.safeParse({ directoryId, search: 's'.repeat(c.operations.directory.searchMaxLength) }).success).toBe(true);
    expect(s.safeParse({ directoryId, search: 's'.repeat(c.operations.directory.searchMaxLength + 1) }).success).toBe(false);
    expect(s.parse({ directoryId, fields: c.operations.directory.fields.join(',') }).fields).toEqual([...c.operations.directory.fields]);
    expect(contracts.CmsDeliveryEntryPayloadSchema.parse({ entryId }).fields).toEqual([...c.operations.entry.fields]);
  });

  it.each([
    {}, { directoryId: null }, { directoryId: 'root' }, { directoryId: entryId, status: 'draft' },
    { directoryId, workspaceId: entryId }, { directoryId, limit: '20' },
    { directoryId, limit: 1.5 }, { directoryId, offset: Infinity },
    { directoryId, sortBy: 'popularity' }, { directoryId, sortDirection: 'up' },
    { directoryId, search: ' ' }, { directoryId, search: 'x'.repeat(201) },
    { directoryId, fields: '' }, { directoryId, fields: 'title,title' },
    { directoryId, fields: 'data.title' }, { directoryId, fields: 'title,' },
    { directoryId, fields: 'createdBy' }, { directoryId, fields: 'body' },
    { directoryId, fields: ['title'] }, { directoryId, fields: 'x'.repeat(129) },
  ])('rejects invalid or over-posted directory payload %#', (payload) => {
    expect(contracts.CmsDeliveryDirectoryPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it('normalizes CSV projection while always retaining id', () => {
    expect(contracts.CmsDeliveryDirectoryPayloadSchema.parse({ directoryId, fields: ' tags, title ', search: ' news ' })).toMatchObject({
      fields: ['id', 'tags', 'title'], search: 'news',
    });
    expect(contracts.CmsDeliveryEntryPayloadSchema.parse({ entryId, fields: 'body' }).fields).toEqual(['id', 'body']);
    expect(contracts.CmsDeliveryEntryPayloadSchema.safeParse({ entryId, limit: 20 }).success).toBe(false);
    expect(contracts.CmsDeliveryEntryPayloadSchema.safeParse({ entryId: 'bad' }).success).toBe(false);
  });

  it('validates bounded full publication summaries separately from projected DTOs', () => {
    const s = contracts.CmsDeliveryPublicationSummarySchema;
    expect(s.parse(summary)).toEqual(summary);
    const b = contracts.CMS_DELIVERY_CONTRACT.summaryBounds;
    expect(s.safeParse({ ...summary, title: 't'.repeat(b.title.max), description: 'd'.repeat(b.descriptionMaxLength), tags: Array(b.tags.maxItems).fill('a'.repeat(b.tags.maxLength)) }).success).toBe(true);
    for (const bad of [
      { title: 't'.repeat(b.title.min - 1) }, { title: 't'.repeat(b.title.max + 1) },
      { description: 'd'.repeat(b.descriptionMaxLength + 1) },
      { tags: Array(b.tags.maxItems + 1).fill('a') },
      { tags: ['t'.repeat(b.tags.minLength - 1)] }, { tags: ['t'.repeat(b.tags.maxLength + 1)] },
    ]) expect(s.safeParse({ ...summary, ...bad }).success).toBe(false);
    for (const bad of [
      { title: ' ' }, { title: 't'.repeat(201) }, { description: 'd'.repeat(4001) },
      { tags: Array(51).fill('a') }, { tags: [''] }, { tags: ['t'.repeat(81)] },
      { publishedAt: null }, { publishedAt: 'not-a-date' }, { id: 'bad' },
      { createdBy: entryId }, { data: {} }, { body: {} },
    ]) expect(s.safeParse({ ...summary, ...bad }).success).toBe(false);
    expect(s.safeParse({ id: entryId }).success).toBe(false);
    expect(contracts.CmsDeliveryListItemSchema.parse({ id: entryId })).toEqual({ id: entryId });
    expect(contracts.CmsDeliveryListItemSchema.safeParse({ title: 'Missing id' }).success).toBe(false);
    expect(contracts.CmsDeliveryListItemSchema.safeParse({ ...summary, body: {} }).success).toBe(false);
    expect(contracts.CmsDeliveryEntrySchema.parse({ id: entryId, body: null })).toEqual({ id: entryId, body: null });
    expect(contracts.CmsDeliveryEntrySchema.safeParse({ id: entryId, isFavorite: true }).success).toBe(false);
  });

  it('accepts JSON object bodies and rejects non-JSON/root-array bodies', () => {
    expect(contracts.CmsDeliveryEntrySchema.safeParse({ id: entryId, body: { value: [null, true, 1, 'text', { nested: [] }] } }).success).toBe(true);
    for (const body of [[], 'html', { value: () => 'not JSON' }, { value: undefined }, { value: NaN }, { value: Infinity }]) {
      expect(contracts.CmsDeliveryEntrySchema.safeParse({ id: entryId, body }).success).toBe(false);
    }
  });

  it('keeps the standard envelope and validates bounded pages without invented totals', () => {
    const s = contracts.CmsDeliveryListResponseSchema;
    expect(s.safeParse({ ok: true, data: { items: [summary], page: { limit: 20, offset: 0, hasMore: false } }, meta: { requestId: 'fixture-request' } }).success).toBe(true);
    for (const page of [{ limit: 0, offset: 0, hasMore: false }, { limit: 20, offset: -1, hasMore: false }, { limit: 20, offset: 0, hasMore: false, total: 5 }]) {
      expect(s.safeParse({ ok: true, data: { items: [], page } }).success).toBe(false);
    }
    expect(s.safeParse({ ok: true, data: { items: [summary, summary], page: { limit: 1, offset: 0, hasMore: false } } }).success).toBe(false);
    expect(s.safeParse({ ok: true, data: { items: Array(101).fill(summary), page: { limit: 100, offset: 0, hasMore: true } } }).success).toBe(false);
    expect(s.safeParse({ ok: true, data: { items: [], page: { limit: 20, offset: 0, hasMore: false } }, debug: {} }).success).toBe(false);
  });

  it('preserves authoring compatibility with an optional, distinct delivery state', () => {
    expect(contracts.CmsDeliveryStateSchema.options).toEqual(['available', 'unpublished', 'republish_required']);
    for (const state of contracts.CmsDeliveryStateSchema.options) expect(contracts.CmsDeliveryStateSchema.parse(state)).toBe(state);
    expect(contracts.CmsDeliveryStateSchema.safeParse('unknown').success).toBe(false);
    expectTypeOf<WorkspaceContentEntry['deliveryState']>().toEqualTypeOf<contracts.CmsDeliveryState | undefined>();
    expectTypeOf<contracts.CmsDeliveryListResponse>().toMatchTypeOf<ApiSuccess<contracts.CmsDeliveryListResult>>();
    expectTypeOf<Extract<keyof contracts.CmsDeliveryListItem, 'createdBy' | 'updatedBy' | 'data' | 'collaborators' | 'isFavorite' | 'body'>>().toEqualTypeOf<never>();
    expectTypeOf<Extract<keyof contracts.CmsDeliveryEntry, 'createdBy' | 'updatedBy' | 'data' | 'ownerName'>>().toEqualTypeOf<never>();
    expectTypeOf<contracts.CmsDeliveryActionKey>().toEqualTypeOf<'cms.delivery.listByDirectory' | 'cms.delivery.getById'>();
  });

  it('binds unavailable errors to the exact generic payload without details', () => {
    const schema = contracts.CmsDeliveryErrorResponseSchema;
    const unavailable = contracts.CMS_DELIVERY_CONTRACT.errors.unavailable;
    const generic = { code: unavailable.code, message: unavailable.message };
    expect(schema.parse({ ok: false, error: generic })).toEqual({ ok: false, error: generic });
    expect(schema.safeParse({ ok: false, error: generic, meta: { requestId: 'fixture-request' } }).success).toBe(true);
    for (const error of [
      { ...generic, message: 'Entry exists but is unpublished' },
      { ...generic, details: {} },
      { ...generic, details: { issues: [{ path: ['entryId'], message: 'Private entry exists' }] } },
    ]) expect(schema.safeParse({ ok: false, error }).success).toBe(false);
  });

  it('preserves validation messages and issue details in the distinct validation variant', () => {
    const error = {
      code: 'VALIDATION_ERROR', message: 'Invalid delivery request',
      details: { issues: [{ path: ['fields', 0], message: 'Invalid delivery fields', code: 'custom' }] },
    };
    expect(contracts.CmsDeliveryErrorResponseSchema.parse({ ok: false, error })).toEqual({ ok: false, error });
    expect(contracts.CmsDeliveryErrorResponseSchema.safeParse({ ok: false, error: { ...error, code: 'UNKNOWN' } }).success).toBe(false);
  });

  it('matches the checked-in metadata and its SHA-256 digest exactly', () => {
    const bytes = readFileSync('contracts/cms-delivery.v1.json', 'utf8');
    expect(JSON.parse(bytes)).toEqual(contracts.CMS_DELIVERY_CONTRACT);
    expect(readFileSync('contracts/cms-delivery.v1.sha256', 'utf8')).toBe(createHash('sha256').update(bytes).digest('hex') + '\n');
  });

  it('validates harmless default/projected/empty/error fixtures using real schemas', () => {
    for (const name of ['directory-success.json', 'directory-empty.json']) expect(contracts.CmsDeliveryListResponseSchema.safeParse(fixture(name)).success).toBe(true);
    for (const name of ['entry-success.json', 'entry-projected.json']) expect(contracts.CmsDeliveryEntryResponseSchema.safeParse(fixture(name)).success).toBe(true);
    for (const name of ['unavailable.json', 'bad-input.json']) expect(contracts.CmsDeliveryErrorResponseSchema.safeParse(fixture(name)).success).toBe(true);
    expect(contracts.CmsDeliveryErrorResponseSchema.safeParse({ ok: false, error: { code: 'ENTRY_NOT_FOUND', message: 'Published content unavailable', stack: 'unsafe' } }).success).toBe(false);
  });
});

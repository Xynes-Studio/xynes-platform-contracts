// Pin the schema API in runtime and declarations across Zod 3/4 peers.
import { z } from 'zod/v3';

function freezeContract<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') freezeContract(child);
  }
  return Object.freeze(value);
}

/** CMS-INT-A1: public specification, not deployment readiness or a scope grant. */
export const CMS_DELIVERY_CONTRACT = freezeContract({
  version: 1,
  operations: {
    directory: {
      method: 'GET', path: '/workspaces/:workspaceId/delivery/entries',
      actionKey: 'cms.delivery.listByDirectory', requiredQuery: ['directoryId'],
      fields: ['id', 'title', 'description', 'tags', 'publishedAt'],
      sortBy: ['publishedAt', 'title'], sortDirection: ['asc', 'desc'],
      defaultSortBy: 'publishedAt', defaultSortDirection: 'desc',
      limit: { min: 1, max: 100, default: 20 },
      offset: { min: 0, max: 10000, default: 0 }, searchMaxLength: 200,
      scope: 'direct_children_of_published_directory',
      ordering: { publishedAt: ['publishedAt', 'id'], title: ['title', 'publishedAt', 'id'] },
    },
    entry: {
      method: 'GET', path: '/workspaces/:workspaceId/delivery/entries/:entryId',
      actionKey: 'cms.delivery.getById',
      fields: ['id', 'title', 'description', 'tags', 'publishedAt', 'body'],
    },
  },
  route: { serviceKey: 'cms-core', targetPath: '/internal/cms-actions', workspaceScoped: true, isPublic: false },
  auth: 'workspace_scoped_readonly_key_or_authorized_user', publication: 'snapshot',
  requiredField: 'id', fieldsEncoding: 'csv', fieldsMaxLength: 128,
  summaryBounds: { title: { min: 1, max: 200 }, descriptionMaxLength: 4000, tags: { maxItems: 50, minLength: 1, maxLength: 80 } },
  bodyFormat: 'json_object_or_null', snapshotMaxBytes: 1048576,
  deliveryStates: ['available', 'unpublished', 'republish_required'],
  errors: {
    unavailable: { status: 404, code: 'ENTRY_NOT_FOUND', message: 'Published content unavailable' },
    invalidInput: { status: 400, code: 'VALIDATION_ERROR' },
  },
} as const);

const directory = CMS_DELIVERY_CONTRACT.operations.directory;
const entry = CMS_DELIVERY_CONTRACT.operations.entry;
const bounds = CMS_DELIVERY_CONTRACT.summaryBounds;

export type CmsDeliveryActionKey = typeof directory.actionKey | typeof entry.actionKey;
export const CmsDeliveryStateSchema = z.enum(CMS_DELIVERY_CONTRACT.deliveryStates);
export type CmsDeliveryState = z.infer<typeof CmsDeliveryStateSchema>;

/** Parse the wire CSV once; validate before adding the mandatory id field. */
function fieldSelector<Fields extends readonly ['id', ...string[]]>(fields: Fields) {
  return z.string().max(CMS_DELIVERY_CONTRACT.fieldsMaxLength).default(fields.join(',')).transform((raw, ctx) => {
    const parsed = z.array(z.enum(fields)).min(1).max(fields.length)
      .refine((names) => new Set(names).size === names.length)
      .safeParse(raw.split(',').map((name) => name.trim()));
    if (!parsed.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid delivery fields' });
      return z.NEVER;
    }
    return [fields[0], ...parsed.data.filter((name) => name !== fields[0])];
  });
}

/** Internal action payload: HTTP query coercion remains the gateway's job. */
export const CmsDeliveryDirectoryPayloadSchema = z.object({
  directoryId: z.string().uuid(),
  sortBy: z.enum(directory.sortBy).default(directory.defaultSortBy),
  sortDirection: z.enum(directory.sortDirection).default(directory.defaultSortDirection),
  limit: z.number().int().min(directory.limit.min).max(directory.limit.max).default(directory.limit.default),
  offset: z.number().int().min(directory.offset.min).max(directory.offset.max).default(directory.offset.default),
  search: z.string().trim().min(1).max(directory.searchMaxLength).optional(),
  fields: fieldSelector(directory.fields),
}).strict();

export const CmsDeliveryEntryPayloadSchema = z.object({
  entryId: z.string().uuid(), fields: fieldSelector(entry.fields),
}).strict();
export type CmsDeliveryDirectoryPayload = z.input<typeof CmsDeliveryDirectoryPayloadSchema>;
export type CmsDeliveryEntryPayload = z.input<typeof CmsDeliveryEntryPayloadSchema>;
export type CmsDeliveryDirectoryOptions = z.output<typeof CmsDeliveryDirectoryPayloadSchema>;
export type CmsDeliveryEntryOptions = z.output<typeof CmsDeliveryEntryPayloadSchema>;

/** Required summary at publication time; projected responses may omit fields. */
export const CmsDeliveryPublicationSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(bounds.title.min).max(bounds.title.max),
  description: z.string().max(bounds.descriptionMaxLength),
  tags: z.array(z.string().trim().min(bounds.tags.minLength).max(bounds.tags.maxLength)).max(bounds.tags.maxItems),
  publishedAt: z.string().datetime({ offset: true }),
}).strict();
export type CmsDeliveryPublicationSummary = z.infer<typeof CmsDeliveryPublicationSummarySchema>;

export type CmsDeliveryJsonValue = string | number | boolean | null | CmsDeliveryJsonValue[] | { [key: string]: CmsDeliveryJsonValue };
const JsonValueSchema: z.ZodType<CmsDeliveryJsonValue> = z.lazy(() => z.union([
  z.string(), z.number().finite(), z.boolean(), z.null(),
  z.array(JsonValueSchema), z.record(z.string(), JsonValueSchema),
]));

export const CmsDeliveryListItemSchema = CmsDeliveryPublicationSummarySchema.partial().required({ id: true });
export const CmsDeliveryEntrySchema = CmsDeliveryListItemSchema.extend({
  body: z.record(z.string(), JsonValueSchema).nullable().optional(),
}).strict();
export type CmsDeliveryListItem = z.infer<typeof CmsDeliveryListItemSchema>;
export type CmsDeliveryEntry = z.infer<typeof CmsDeliveryEntrySchema>;

export const CmsDeliveryListResultSchema = z.object({
  items: z.array(CmsDeliveryListItemSchema).max(directory.limit.max),
  page: z.object({
    limit: z.number().int().min(directory.limit.min).max(directory.limit.max),
    offset: z.number().int().min(directory.offset.min).max(directory.offset.max),
    hasMore: z.boolean(),
  }).strict(),
}).strict().refine((result) => result.items.length <= result.page.limit, { message: 'Delivery page exceeds limit' });
export const CmsDeliveryEntryResultSchema = z.object({ entry: CmsDeliveryEntrySchema }).strict();
export type CmsDeliveryListResult = z.infer<typeof CmsDeliveryListResultSchema>;
export type CmsDeliveryEntryResult = z.infer<typeof CmsDeliveryEntryResultSchema>;

const meta = z.object({ requestId: z.string() }).strict().optional();
function successEnvelope<Schema extends z.ZodType<unknown>>(data: Schema) {
  return z.object({ ok: z.literal(true), data, meta }).strict();
}
export const CmsDeliveryListResponseSchema = successEnvelope(CmsDeliveryListResultSchema);
export const CmsDeliveryEntryResponseSchema = successEnvelope(CmsDeliveryEntryResultSchema);
export type CmsDeliveryListResponse = z.infer<typeof CmsDeliveryListResponseSchema>;
export type CmsDeliveryEntryResponse = z.infer<typeof CmsDeliveryEntryResponseSchema>;

/** Delivery's 400/404 examples; gateway auth/transient errors use ApiError. */
export const CmsDeliveryErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.enum([CMS_DELIVERY_CONTRACT.errors.unavailable.code, CMS_DELIVERY_CONTRACT.errors.invalidInput.code]),
    message: z.string().min(1),
    details: z.object({
      issues: z.array(z.object({
        path: z.array(z.union([z.string(), z.number()])), message: z.string(), code: z.string().optional(),
      }).strict()).optional(),
    }).strict().optional(),
  }).strict(), meta,
}).strict();

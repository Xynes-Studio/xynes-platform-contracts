export interface BlogEntryData {
  slug: string;
  title: string;
  excerpt?: string;
  tags?: string[];
  coverImageUrl?: string;
  publishedAt?: string | null;
}

export interface BlogEntryCreatePayload {
  contentTypeId: string;
  documentId?: string | null;
  data: BlogEntryData;
}

export interface BlogEntryReadPayload {
  contentTypeId: string;
  slug?: string;
}

export interface BlogEntryResponse {
  entry: {
    id: string;
    workspaceId: string;
    contentTypeId: string;
    documentId?: string | null;
    data: BlogEntryData;
    createdAt: string;
    updatedAt: string;
  };
}

export interface BlogEntryListPublishedPayload {
  limit?: number;
  offset?: number;
  tag?: string;
}

export interface BlogEntryGetPublishedBySlugPayload {
  slug: string;
}

export interface CmsContentTypesListForWorkspacePayload {
  includeTemplates?: boolean;
}

export interface CmsTemplateSummary {
  id: string;
  key: string;
  name: string;
  fieldsSchema: unknown;
}

export interface CmsContentTypeSummary {
  id: string;
  name: string;
  slug: string;
  routeSegment: string;
  templateKey: string;
  templateId?: string | null;
  template?: CmsTemplateSummary | null;
}

export type CmsContentTypesListForWorkspaceResult = CmsContentTypeSummary[];

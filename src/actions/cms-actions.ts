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

export type WorkspaceContentEntryStatus = "draft" | "published" | "archived";
export type WorkspaceContentEntrySortBy = "date" | "title" | "popularity";
export type WorkspaceContentEntrySortDirection = "asc" | "desc";

export interface WorkspaceContentEntry {
  id: string;
  workspaceId: string;
  directoryId: string | null;
  title: string;
  description: string;
  body: unknown;
  tags: string[];
  ownerName: string | null;
  avatarUrl: string | null;
  status: WorkspaceContentEntryStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  collaborators: string[];
  isFavorite: boolean;
}

export interface WorkspaceContentEntriesListPayload {
  directoryId?: string | null;
  search?: string;
  sortBy?: WorkspaceContentEntrySortBy;
  sortDirection?: WorkspaceContentEntrySortDirection;
  status?: WorkspaceContentEntryStatus | "all";
  limit?: number;
  offset?: number;
}

export interface WorkspaceContentEntriesListResult {
  items: WorkspaceContentEntry[];
  count: number;
}

export interface WorkspaceContentEntryCreatePayload {
  directoryId?: string | null;
  title: string;
  description?: string;
  body?: Record<string, unknown>;
  tags?: string[];
  ownerName?: string;
  avatarUrl?: string;
  publishNow?: boolean;
}

export interface WorkspaceContentEntryUpdatePayload {
  entryId: string;
  directoryId?: string | null;
  title?: string;
  description?: string;
  body?: Record<string, unknown>;
  tags?: string[];
  ownerName?: string;
  avatarUrl?: string;
}

export interface WorkspaceContentEntryByIdPayload {
  entryId: string;
}

export interface WorkspaceContentEntryPublishPayload {
  entryId: string;
}

export interface WorkspaceContentEntryDeletePayload {
  entryId: string;
}

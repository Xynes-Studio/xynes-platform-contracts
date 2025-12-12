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

export type WorkspaceId = string;
export type UserId = string;

export interface Document {
  id: string;
  workspaceId: WorkspaceId;
  type: string;
  status: 'draft' | 'published' | 'archived';
  content: string;
}

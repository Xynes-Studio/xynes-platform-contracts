import { z } from 'zod';

export const WorkspaceIdSchema = z.string();
export const UserIdSchema = z.string();

export const DocumentSchema = z.object({
  id: z.string(),
  workspaceId: WorkspaceIdSchema,
  type: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  content: z.string(),
});

import { describe, it, expect } from "vitest";
import {
  DomainError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  InternalError,
  ActionRequestEnvelope,
  CmsContentTypesListForWorkspacePayload,
  CmsContentTypesListForWorkspaceResult,
  WorkspaceContentEntriesListPayload,
  WorkspaceContentEntriesListResult,
  WorkspaceContentEntryCreatePayload,
} from "../index";

describe("Domain Errors", () => {
  it("should be instance of Error and DomainError", () => {
    const error = new ValidationError("Invalid input");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(ValidationError);
  });

  it("should have correct error codes", () => {
    expect(new ValidationError().code).toBe("VALIDATION_ERROR");
    expect(new NotFoundError("User").code).toBe("NOT_FOUND");
    expect(new ForbiddenError().code).toBe("FORBIDDEN");
    expect(new ConflictError().code).toBe("CONFLICT");
    expect(new InternalError().code).toBe("INTERNAL_ERROR");
  });

  it("should carry details and cause", () => {
    const details = { field: "email", reason: "invalid" };
    const error = new ValidationError("Invalid input", details);

    expect(error.details).toEqual(details);
    expect(error.message).toBe("Invalid input");
  });
});

describe("Action Contracts", () => {
  it("should allow typing ActionRequestEnvelope", () => {
    interface MyPayload {
      foo: string;
      bar: number;
    }

    const envelope: ActionRequestEnvelope<MyPayload> = {
      actionKey: "my.action",
      payload: {
        foo: "hello",
        bar: 123,
      },
    };

    expect(envelope.actionKey).toBe("my.action");
    expect(envelope.payload.foo).toBe("hello");
    expect(envelope.payload.bar).toBe(123);
  });

  it("should type legacy cms.content_types.listForWorkspace payload", () => {
    const payload: CmsContentTypesListForWorkspacePayload = {
      includeTemplates: true,
    };

    expect(payload.includeTemplates).toBe(true);
  });

  it("should type legacy cms.content_types.listForWorkspace result", () => {
    const result: CmsContentTypesListForWorkspaceResult = [
      {
        id: "ct-1",
        name: "Blog",
        slug: "blog-post",
        routeSegment: "blog",
        templateKey: "blog_post",
      },
    ];

    expect(result[0]?.routeSegment).toBe("blog");
  });

  it("should type directory-first cms.entry.listByDirectory payload", () => {
    const payload: WorkspaceContentEntriesListPayload = {
      directoryId: "dir-1",
      search: "draft",
      sortBy: "date",
      sortDirection: "desc",
      status: "draft",
      limit: 20,
      offset: 0,
    };

    expect(payload.directoryId).toBe("dir-1");
  });

  it("should type directory-first cms.entry.create payload", () => {
    const payload: WorkspaceContentEntryCreatePayload = {
      directoryId: "dir-1",
      title: "Untitled",
      tags: ["news"],
    };

    expect(payload.title).toBe("Untitled");
    expect(payload.directoryId).toBe("dir-1");
  });

  it("should type directory-first cms.entry.listByDirectory result", () => {
    const result: WorkspaceContentEntriesListResult = {
      items: [
        {
          id: "entry-1",
          workspaceId: "workspace-1",
          directoryId: "dir-1",
          title: "Entry title",
          description: "Entry description",
          body: { blocks: [] },
          tags: ["news"],
          ownerName: "Owner",
          avatarUrl: null,
          status: "draft",
          publishedAt: null,
          createdAt: "2026-03-02T00:00:00.000Z",
          updatedAt: "2026-03-02T00:00:00.000Z",
          collaborators: ["A"],
          isFavorite: false,
        },
      ],
      count: 1,
    };

    expect(result.items[0]?.directoryId).toBe("dir-1");
    expect(result.count).toBe(1);
  });
});

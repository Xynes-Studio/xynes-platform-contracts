// A generic action key – we’ll refine this later with unions if needed.
export type ActionKey = string;

// Context passed *around* services (not necessarily over the wire,
// but shared as a shape for internal handlers).
export interface ActionContext {
  workspaceId?: string;
  userId?: string;
  requestId?: string;
}

// What service action handlers look like inside a service.
export type ActionHandler<Payload, Result> = (
  payload: Payload,
  ctx: ActionContext
) => Promise<Result>;

// Envelope used at service boundaries (e.g., the body of /internal/*-actions).
// This is *logical* contract – real HTTP body will match this shape.
export interface ActionRequestEnvelope<P = unknown> {
  actionKey: ActionKey;
  payload: P;
}

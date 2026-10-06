import { describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { signInternalRequest, verifyInternalRequest, type InternalRequest } from '../security/internal-request';

const identity = (issuer: string) => {
  const keys = generateKeyPairSync('ed25519');
  return { signer: { issuer, keyId: issuer + '-1', privateKey: keys.privateKey }, trust: { issuer, keyId: issuer + '-1', publicKey: keys.publicKey } };
};
const request = (audience: string, operation: string, path: string, payload: unknown = {}) => ({
  audience, operation, url: 'http://receiver' + path, method: 'POST',
  headers: new Headers({ 'X-Request-Id': 'fixture-request', 'X-Workspace-Id': 'tenant-a', 'X-XS-User-Id': 'actor-a' }),
  body: JSON.stringify(path === '/authz/check' ? { userId: 'actor-a', workspaceId: 'tenant-a', actionKey: 'cms.entry.create' } : { actionKey: operation, payload }),
} satisfies InternalRequest);

const receivers = [
  ['cms-service', 'cms.entry.create', '/internal/cms-actions'],
  ['doc-service', 'docs.document.read', '/internal/doc-actions'],
  ['storage-service', 'platform.storage.objects.read', '/internal/storage-actions'],
  ['telemetry-service', 'telemetry.events.ingest', '/internal/telemetry-actions'],
] as const;

describe('remaining receiver identities and explicit capabilities', () => {
  it.each(receivers)('accepts gateway on %s and rejects a trusted sibling', (audience, operation, path) => {
    const gateway = identity('gateway'); const sibling = identity('cms');
    const req = request(audience, operation, path);
    const trust = [gateway.trust, sibling.trust];
    expect(verifyInternalRequest(signInternalRequest(req, gateway.signer, 100), req, trust, 101)).toBe(true);
    expect(verifyInternalRequest(signInternalRequest(req, sibling.signer, 100), req, trust, 101)).toBe(false);
    const unknown = { ...req, operation: 'unregistered.action', body: JSON.stringify({ actionKey: 'unregistered.action' }) };
    expect(verifyInternalRequest(signInternalRequest(unknown, gateway.signer, 100), unknown, trust, 101)).toBe(false);
  });

  it.each(['cms', 'docs'])('allows %s only to check its own read permissions, never assign/list roles', (issuer) => {
    const caller = identity(issuer);
    const req = request('authz-service', 'authz.check', '/authz/check');
    req.body = JSON.stringify({ userId: 'actor-a', workspaceId: 'tenant-a', actionKey: issuer === 'cms' ? 'cms.entry.create' : 'docs.document.read' });
    expect(verifyInternalRequest(signInternalRequest(req, caller.signer, 100), req, [caller.trust], 101)).toBe(true);
    for (const op of ['authz.assignRole', 'authz.listRolesForWorkspace']) {
      const mutation = request('authz-service', op, '/internal/authz-actions', { workspaceId: 'tenant-a' });
      expect(verifyInternalRequest(signInternalRequest(mutation, caller.signer, 100), mutation, [caller.trust], 101)).toBe(false);
    }
    const foreign = { ...req, body: JSON.stringify({ userId: 'actor-a', workspaceId: 'tenant-a', actionKey: issuer === 'cms' ? 'docs.document.read' : 'cms.entry.create' }) };
    expect(verifyInternalRequest(signInternalRequest(foreign, caller.signer, 100), foreign, [caller.trust], 101)).toBe(false);
  });

  it('rejects signed payload/header actor and workspace disagreement', () => {
    const gateway = identity('gateway');
    const req = request('authz-service', 'authz.check', '/authz/check');
    for (const body of [
      { userId: 'actor-b', workspaceId: 'tenant-a', actionKey: 'cms.entry.create' },
      { userId: 'actor-a', workspaceId: 'tenant-b', actionKey: 'cms.entry.create' },
    ]) {
      const mismatch = { ...req, body: JSON.stringify(body) };
      expect(verifyInternalRequest(signInternalRequest(mismatch, gateway.signer, 100), mismatch, [gateway.trust], 101)).toBe(false);
    }
    for (const [audience, operation, path] of receivers) {
      const mismatch = request(audience, operation, path, { workspaceId: 'tenant-b' });
      expect(verifyInternalRequest(signInternalRequest(mismatch, gateway.signer, 100), mismatch, [gateway.trust], 101)).toBe(false);
    }
  });

  it('retains accounts role capabilities and denies legacy tokens', () => {
    const accounts = identity('accounts');
    const req = request('authz-service', 'authz.assignRole', '/internal/authz-actions', { workspaceId: 'tenant-a', userId: 'target-user' });
    expect(verifyInternalRequest(signInternalRequest(req, accounts.signer, 100), req, [accounts.trust], 101)).toBe(true);
    expect(verifyInternalRequest('shared-static-token', req, [accounts.trust], 101)).toBe(false);
  });
});

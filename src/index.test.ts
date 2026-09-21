import { describe, it, expect } from 'vitest';
import {
  API_ERROR_CODES,
  ERROR_STATUS,
  API_ROUTES,
  API_KEY_FORMAT_RE,
  apiKeyCreateSchema,
  apiKeyUpdateSchema,
  COMMENTER_WRITABLE_KEYS,
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  hasPermission,
  invitationCreateSchema,
  isCommenterMark,
  markPermissionsFor,
  maxRole,
  minRole,
  requiredRoleFor,
  roleAtLeast,
  shareLinkCreateSchema,
  shareLinkUpdateSchema,
  shareUnlockSchema,
  workspaceCreateSchema,
  workspaceTransferSchema,
  SYNC_CLOSE_CODES,
  SYNC_MESSAGE_TYPES,
  commandBatchRequestSchema,
  cursorQuerySchema,
  documentCreateSchema,
  documentImportSchema,
  elementsBatchRequestSchema,
  scenesBatchRequestSchema,
  errorResponse,
  isId,
  meUpdateSchema,
  newId,
  snapshotCreateSchema,
  successResponse,
  syncFrameSchema,
  JOB_KINDS,
  JOB_LANES,
  aiKindForTask,
  isAiKind,
  isTerminalJobStatus,
  jobCreateSchema,
  jobGetQuerySchema,
  jobListQuerySchema,
} from './index.js';
import {
  makeDocumentMeta,
  makeProject,
  makeSnapshotSummary,
  makeWorkspace,
} from './test/index.js';

describe('envelope', () => {
  it('round-trips through JSON', () => {
    const ok = successResponse({ a: 1 });
    expect(JSON.parse(JSON.stringify(ok))).toEqual({
      success: true,
      data: { a: 1 },
    });
    const err = errorResponse('nope', API_ERROR_CODES.NOT_FOUND, { x: 1 });
    expect(JSON.parse(JSON.stringify(err))).toEqual({
      success: false,
      error: 'nope',
      code: 'NOT_FOUND',
      details: { x: 1 },
    });
  });
  it('has a non-empty code vocabulary with statuses', () => {
    const codes = Object.keys(API_ERROR_CODES);
    expect(codes.length).toBeGreaterThan(100);
    for (const c of codes) expect(ERROR_STATUS[c as never]).toBeGreaterThan(0);
    expect(ERROR_STATUS.EPOCH_MISMATCH).toBe(409);
  });
});

describe('schemas', () => {
  it('cursorQuery applies defaults and bounds', () => {
    expect(cursorQuerySchema.parse({}).limit).toBe(50);
    expect(cursorQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });
  it('documentCreate accepts valid, rejects bad kind', () => {
    expect(
      documentCreateSchema.safeParse({ title: 'A', kind: 'script' }).success
    ).toBe(true);
    expect(
      documentCreateSchema.safeParse({ title: 'A', kind: 'nope' }).success
    ).toBe(false);
  });
  it('meUpdate and snapshotCreate validate', () => {
    expect(meUpdateSchema.safeParse({ uiLanguage: 'fr' }).success).toBe(true);
    expect(meUpdateSchema.safeParse({ uiLanguage: 'xx' }).success).toBe(false);
    expect(snapshotCreateSchema.safeParse({ name: 'v1' }).success).toBe(true);
    expect(snapshotCreateSchema.safeParse({ name: '' }).success).toBe(false);
  });
  it('commandBatch requires commands and baseEpoch', () => {
    expect(
      commandBatchRequestSchema.safeParse({
        commands: [{ type: 'x' }],
        baseEpoch: 0,
      }).success
    ).toBe(true);
    expect(commandBatchRequestSchema.safeParse({ commands: [] }).success).toBe(
      false
    );
  });
});

describe('ids (via writing_core path)', () => {
  it('re-exports newId/isId', () => {
    expect(typeof newId).toBe('function');
    expect(isId('doc', 'not-an-id')).toBe(false);
  });
});

describe('sync frames', () => {
  const u8 = new Uint8Array([1, 2, 3]);
  const samples = [
    {
      channelId: 0,
      type: 'auth',
      payload: {
        scheme: 'firebase',
        token: 't',
        deviceId: 'd',
        installId: 'i',
        clientVersion: '1',
        schemaVersion: 1,
      },
    },
    {
      channelId: 0,
      type: 'authOk',
      payload: {
        userId: 'u',
        sessionId: 's',
        serverSchemaVersion: 1,
        heartbeatMs: 25000,
        maxFrameBytes: 1048576,
      },
    },
    {
      channelId: 0,
      type: 'authError',
      payload: { code: 'DEVICE_REVOKED', message: 'm' },
    },
    { channelId: 0, type: 'reauth', payload: { token: 't' } },
    { channelId: 0, type: 'ping', payload: { t: 1 } },
    { channelId: 0, type: 'pong', payload: { t: 1 } },
    {
      channelId: 0,
      type: 'subscribe',
      payload: { channelId: 1, documentId: 'doc_x', epoch: 0, mode: 'edit' },
    },
    {
      channelId: 1,
      type: 'subscribed',
      payload: {
        documentId: 'doc_x',
        role: 'owner',
        epoch: 0,
        markPermissions: {},
        schemaVersion: 1,
      },
    },
    {
      channelId: 1,
      type: 'subscribeError',
      payload: { code: 'EPOCH_MISMATCH', detail: 2 },
    },
    { channelId: 0, type: 'unsubscribe', payload: { channelId: 1 } },
    { channelId: 1, type: 'syncStep1', payload: u8 },
    { channelId: 1, type: 'syncStep2', payload: u8 },
    {
      channelId: 1,
      type: 'update',
      payload: { epoch: 0, clientSeq: 1, update: u8 },
    },
    { channelId: 1, type: 'ack', payload: { clientSeq: 1, serverSeq: 5 } },
    {
      channelId: 1,
      type: 'reject',
      payload: { clientSeq: 1, code: 'FORBIDDEN' },
    },
    { channelId: 1, type: 'awareness', payload: u8 },
    {
      channelId: 1,
      type: 'epochChanged',
      payload: { newEpoch: 1, reason: 'snapshot-open', byUserId: 'u' },
    },
    {
      channelId: 1,
      type: 'roleChanged',
      payload: { role: 'none', markPermissions: {} },
    },
    {
      channelId: 1,
      type: 'documentDeleted',
      payload: { byUserId: 'u', recoverableUntil: '2026-01-01T00:00:00Z' },
    },
    {
      channelId: 1,
      type: 'normalized',
      payload: { serverSeq: 1, contentHashes: { el_a: 'h' } },
    },
    {
      channelId: 0,
      type: 'serverShutdown',
      payload: { reconnectAfterMs: 1000 },
    },
  ];
  it('parses one sample of every message type', () => {
    for (const s of samples) {
      const res = syncFrameSchema.safeParse(s);
      expect(res.success, s.type).toBe(true);
    }
    const covered = new Set(samples.map((s) => s.type));
    for (const name of Object.keys(SYNC_MESSAGE_TYPES)) {
      expect(covered.has(name), name).toBe(true);
    }
  });
  it('rejects a bad frame and exposes close codes', () => {
    expect(
      syncFrameSchema.safeParse({ channelId: 0, type: 'auth', payload: {} })
        .success
    ).toBe(false);
    expect(SYNC_CLOSE_CODES.PROTOCOL_UNSUPPORTED).toBe(4406);
  });
});

describe('import and export', () => {
  it('routes, error codes and import schema', () => {
    expect(API_ROUTES.documentImport.path).toBe('/projects/:pid/documents/import');
    expect(API_ROUTES.documentExport.method).toBe('POST');
    expect(API_ROUTES.formatsList.path).toBe('/formats');
    expect(API_ROUTES.aiStatus.path).toBe('/ai/status');
    expect(ERROR_STATUS.UNSUPPORTED_FORMAT).toBe(400);
    expect(ERROR_STATUS.IMPORT_FAILED).toBe(400);
    expect(ERROR_STATUS.IMPORT_INVALID).toBe(422);
    expect(ERROR_STATUS.IMPORT_TOO_LARGE).toBe(413);
    expect(
      documentImportSchema.safeParse({ filename: 'a.fdx', contentB64: 'AA==' }).success
    ).toBe(true);
    expect(documentImportSchema.safeParse({ contentB64: 'AA==' }).success).toBe(false);
  });
});

describe('routes and fixtures', () => {
  it('route table has entries', () => {
    expect(API_ROUTES.commands.method).toBe('POST');
    expect(API_ROUTES.scenesBatch.path).toBe('/documents/:did/scenes/batch');
    expect(API_ROUTES.elementsBatch.path).toBe('/documents/:did/elements/batch');
    expect(elementsBatchRequestSchema.safeParse({ elementIds: Array(501).fill('el_x') }).success).toBe(false);
    expect(scenesBatchRequestSchema.safeParse({ sceneIds: ['el_x'] }).success).toBe(true);
    expect(scenesBatchRequestSchema.safeParse({ sceneIds: Array(21).fill('el_x') }).success).toBe(false);
    expect(Object.keys(API_ROUTES).length).toBeGreaterThan(30);
  });
  it('fixtures build', () => {
    expect(makeWorkspace().kind).toBe('personal');
    expect(makeProject({ name: 'X' }).name).toBe('X');
    expect(makeDocumentMeta().epoch).toBe(0);
    expect(makeSnapshotSummary().kind).toBe('manual');
  });
});

describe('api keys', () => {
  it('create schema defaults ai and bounds name and expiry', () => {
    const ok = apiKeyCreateSchema.parse({ name: 'n', workspaceId: 'ws_x', scope: 'read' });
    expect(ok.ai).toBe(false);
    expect(apiKeyCreateSchema.safeParse({ name: '', workspaceId: 'ws_x', scope: 'read' }).success).toBe(false);
    expect(apiKeyCreateSchema.safeParse({ name: 'n', workspaceId: 'ws_x', scope: 'admin' }).success).toBe(false);
    expect(apiKeyCreateSchema.safeParse({ name: 'n', workspaceId: 'ws_x', scope: 'read', expiresInDays: 366 }).success).toBe(false);
    expect(apiKeyCreateSchema.safeParse({ name: 'n', workspaceId: 'ws_x', scope: 'read', expiresInDays: 0 }).success).toBe(false);
    expect(apiKeyUpdateSchema.safeParse({ ai: true }).success).toBe(true);
  });
  it('key format and routes', () => {
    expect(API_KEY_FORMAT_RE.test('fwk_a1b2c3d4_' + 'A'.repeat(43))).toBe(true);
    expect(API_KEY_FORMAT_RE.test('fwk_a1b2c3d4_short')).toBe(false);
    expect(API_ROUTES.apiKeyRevoke.method).toBe('DELETE');
    expect(API_ROUTES.apiKeyUpdate.path).toBe('/api-keys/:kid');
  });
});

describe('roles and permissions (spec 05 §5.2)', () => {
  it('has a permission list per role, owner holds all, and the matrix is monotonic', () => {
    expect(new Set(Object.keys(ROLE_PERMISSIONS))).toEqual(new Set(ROLES));
    expect(ROLE_PERMISSIONS.owner).toHaveLength(PERMISSIONS.length);
    for (let i = 1; i < ROLES.length; i++) {
      const higher = new Set(ROLE_PERMISSIONS[ROLES[i - 1]!]);
      for (const p of ROLE_PERMISSIONS[ROLES[i]!]) expect(higher.has(p), `${ROLES[i - 1]} lacks ${p}`).toBe(true);
    }
  });
  it('matches the spec table on the rows that matter', () => {
    expect(hasPermission('viewer', 'document.read')).toBe(true);
    expect(hasPermission('viewer', 'document.edit')).toBe(false);
    expect(hasPermission('viewer', 'document.comment')).toBe(false);
    expect(hasPermission('commenter', 'document.comment')).toBe(true);
    expect(hasPermission('commenter', 'ai.review')).toBe(true);
    expect(hasPermission('commenter', 'ai.run')).toBe(false);
    expect(hasPermission('commenter', 'document.edit')).toBe(false);
    expect(hasPermission('writer', 'document.edit')).toBe(true);
    expect(hasPermission('writer', 'share.manage')).toBe(true);
    expect(hasPermission('writer', 'members.invite')).toBe(false);
    expect(hasPermission('writer', 'project.purge')).toBe(false);
    expect(hasPermission('admin', 'members.invite')).toBe(true);
    expect(hasPermission('admin', 'workspace.audit')).toBe(true);
    expect(hasPermission('admin', 'workspace.aiToggle')).toBe(false);
    expect(hasPermission('admin', 'workspace.delete')).toBe(false);
    expect(hasPermission('owner', 'workspace.transfer')).toBe(true);
    expect(requiredRoleFor('document.edit')).toBe('writer');
    expect(requiredRoleFor('workspace.aiToggle')).toBe('owner');
  });
  it('orders roles', () => {
    expect(roleAtLeast('admin', 'writer')).toBe(true);
    expect(roleAtLeast('viewer', 'commenter')).toBe(false);
    expect(maxRole('viewer', null, 'writer')).toBe('writer');
    expect(maxRole(null, undefined)).toBeNull();
    expect(minRole('owner', 'writer')).toBe('writer');
  });
  it('every permission named by a route exists in the matrix', () => {
    const known = new Set<string>(PERMISSIONS);
    for (const [name, r] of Object.entries(API_ROUTES)) {
      if (r.permission) expect(known.has(r.permission), `${name}: ${r.permission}`).toBe(true);
    }
  });
});

describe('B8 routes and schemas', () => {
  it('declares the 34 routes of the slice (plus the project-parent variants)', () => {
    const have = new Set(Object.values(API_ROUTES).map(r => `${r.method} ${r.path}`));
    const appendix = [
      'GET /me/shared', 'POST /workspaces', 'PATCH /workspaces/:wid', 'GET /workspaces/:wid/audit.csv', 'DELETE /workspaces/:wid',
      'POST /workspaces/:wid/transfer', 'GET /workspaces/:wid/usage', 'GET /workspaces/:wid/members', 'PATCH /workspaces/:wid/members/:uid',
      'DELETE /workspaces/:wid/members/:uid', 'POST /workspaces/:wid/leave', 'POST /workspaces/:wid/invitations',
      'POST /projects/:pid/invitations', 'POST /documents/:did/invitations', 'GET /workspaces/:wid/invitations', 'GET /me/invitations',
      'POST /invitations/:iid/renew', 'DELETE /invitations/:iid', 'POST /invitations/accept', 'POST /invitations/:iid/decline',
      'POST /documents/:did/lock', 'DELETE /documents/:did/lock', 'POST /documents/:did/unlock-session', 'POST /snapshots/:sid/share-links',
      'GET /public/share/:token', 'POST /share/:token/unlock', 'GET /share/:token/state', 'POST /documents/:did/share-links',
      'GET /documents/:did/share-links', 'PATCH /share-links/:lid', 'DELETE /share-links/:lid', 'GET /documents/:did/grants',
      'PATCH /grants/:gid', 'DELETE /grants/:gid',
    ];
    expect(appendix).toHaveLength(34);
    for (const a of appendix) expect(have.has(a), a).toBe(true);
    for (const a of ['POST /projects/:pid/share-links', 'GET /projects/:pid/share-links', 'GET /projects/:pid/grants']) expect(have.has(a), a).toBe(true);
    expect(have.size).toBe(Object.keys(API_ROUTES).length); // no duplicate method+path
  });
  it('validates the sharing requests', () => {
    expect(workspaceCreateSchema.safeParse({ name: 'Writers room' }).success).toBe(true);
    expect(workspaceCreateSchema.safeParse({ name: '' }).success).toBe(false);
    expect(workspaceCreateSchema.safeParse({ name: 'x'.repeat(81) }).success).toBe(false);
    expect(workspaceTransferSchema.safeParse({}).success).toBe(false);
    expect(invitationCreateSchema.safeParse({ email: 'a@b.co', role: 'viewer' }).success).toBe(true);
    expect(invitationCreateSchema.safeParse({ email: 'nope', role: 'viewer' }).success).toBe(false);
    expect(invitationCreateSchema.safeParse({ email: 'a@b.co', role: 'boss' }).success).toBe(false);
    const link = shareLinkCreateSchema.parse({ access: 'view' });
    expect(link).toMatchObject({ generalAccess: 'anyone', allowDownload: true });
    expect(shareLinkCreateSchema.safeParse({ access: 'edit' }).success).toBe(false);
    expect(shareLinkCreateSchema.safeParse({ access: 'comment', generalAccess: 'restricted', expiresAt: '2030-01-01T00:00:00Z' }).success).toBe(true);
    expect(shareLinkUpdateSchema.safeParse({ password: 'a', clearPassword: true }).success).toBe(false);
    expect(shareLinkUpdateSchema.safeParse({ clearPassword: true, allowDownload: false }).success).toBe(true);
    expect(shareUnlockSchema.safeParse({}).success).toBe(true);
  });
  it('projects roles onto the sync write matrix', () => {
    expect(markPermissionsFor('writer')).toEqual({ edit: true, comment: true, highlight: true });
    expect(markPermissionsFor('commenter')).toEqual({ edit: false, comment: true, highlight: true });
    expect(markPermissionsFor('viewer')).toEqual({ edit: false, comment: false, highlight: false });
    expect(markPermissionsFor('none').edit).toBe(false);
    expect(COMMENTER_WRITABLE_KEYS).toEqual(['notes']);
    expect(isCommenterMark('n:note_1')).toBe(true);
    expect(isCommenterMark('hl')).toBe(true);
    expect(isCommenterMark('bold')).toBe(false);
    expect(isCommenterMark('ins')).toBe(false);
  });
  it('the auth frame carries an optional unlock token and the link scheme', () => {
    const base = { scheme: 'link', token: 'fls_x', deviceId: 'd', installId: 'i', clientVersion: '1', schemaVersion: 1 };
    expect(syncFrameSchema.safeParse({ channelId: 0, type: 'auth', payload: base }).success).toBe(true);
    expect(syncFrameSchema.safeParse({ channelId: 0, type: 'auth', payload: { ...base, unlockToken: 'u' } }).success).toBe(true);
  });
});

describe('jobs (B9)', () => {
  it('routes, error codes and kinds', () => {
    expect(API_ROUTES.jobCreate.method).toBe('POST');
    expect(API_ROUTES.jobOutputs.path).toBe('/jobs/:jobId/outputs');
    expect(API_ROUTES.jobWebhook.auth).toBe('W');
    expect(ERROR_STATUS.JOB_KIND_DISABLED).toBe(501);
    expect(ERROR_STATUS.IDEMPOTENCY_KEY_REUSED).toBe(409);
    expect(ERROR_STATUS.PAYLOAD_TOO_LARGE).toBe(413);
    expect(new Set(JOB_KINDS).size).toBe(JOB_KINDS.length);
    expect(JOB_LANES).toContain('provider');
    expect(aiKindForTask('coverage')).toBe('ai.review');
    expect(aiKindForTask('polish.dialogue')).toBe('ai.polish');
    expect(isAiKind('ai.polish')).toBe(true);
    expect(isTerminalJobStatus('running')).toBe(false);
    expect(isTerminalJobStatus('cancelled')).toBe(true);
  });
  it('create, list and get schemas', () => {
    const ok = jobCreateSchema.parse({ kind: 'test.echo' });
    expect(ok.input).toEqual({});
    expect(ok.sources).toEqual([]);
    expect(jobCreateSchema.safeParse({ kind: 'nope.kind' }).success).toBe(false);
    expect(jobCreateSchema.safeParse({ kind: 'test.echo', idempotencyKey: '' }).success).toBe(false);
    expect(jobCreateSchema.safeParse({ kind: 'test.echo', idempotencyKey: 'k'.repeat(129) }).success).toBe(false);
    expect(jobListQuerySchema.safeParse({ kind: 'ai.', status: 'running' }).success).toBe(true);
    expect(jobListQuerySchema.safeParse({ status: 'done' }).success).toBe(false);
    expect(jobGetQuerySchema.parse({ wait: '30' }).wait).toBe(30);
    expect(jobGetQuerySchema.safeParse({ wait: '121' }).success).toBe(false);
  });
});

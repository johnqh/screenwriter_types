import { describe, it, expect } from 'vitest';
import {
  API_ERROR_CODES,
  ERROR_STATUS,
  API_ROUTES,
  SYNC_CLOSE_CODES,
  SYNC_MESSAGE_TYPES,
  commandBatchRequestSchema,
  cursorQuerySchema,
  documentCreateSchema,
  documentImportSchema,
  errorResponse,
  isId,
  meUpdateSchema,
  newId,
  snapshotCreateSchema,
  successResponse,
  syncFrameSchema,
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
    expect(Object.keys(API_ROUTES).length).toBeGreaterThan(30);
  });
  it('fixtures build', () => {
    expect(makeWorkspace().kind).toBe('personal');
    expect(makeProject({ name: 'X' }).name).toBe('X');
    expect(makeDocumentMeta().epoch).toBe(0);
    expect(makeSnapshotSummary().kind).toBe('manual');
  });
});

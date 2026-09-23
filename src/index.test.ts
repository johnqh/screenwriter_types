import { describe, it, expect } from 'vitest';
import {
  DOCUMENT_LABELS_MAX,
  FOLDER_MAX_DEPTH,
  PROJECT_BIN_ITEM_MAX_BYTES,
  PROJECT_KINDS,
  TRASH_RETENTION_DAYS,
  documentApplyTemplateSchema,
  documentDuplicateSchema,
  documentMoveSchema,
  documentUpdateSchema,
  documentListQuerySchema,
  projectBinCreateSchema,
  projectCreateSchema,
  projectDuplicateSchema,
  projectFolderCreateSchema,
  projectFolderUpdateSchema,
  projectPurgeSchema,
  templateCreateSchema,
  templateExportQuerySchema,
  templateImportSchema,
  templateUpdateSchema,
  trashEmptySchema,
  workspaceContactsCreateSchema,
  workspaceContactPatchSchema,
  workspaceContactsQuerySchema,
  workspaceDefaultsPutSchema,
  workspaceDefaultsSchema,
  workspaceDocumentsQuerySchema,
  workspaceUpdateSchema,
  accountDeleteSchema,
  dictionaryUpdateSchema,
  documentViewStatePutSchema,
  userMacroPatchSchema,
  userMacroSchema,
  userPreferencesPutSchema,
  userPreferencesSchema,
  writingGoalsPutSchema,
  writingSessionSchema,
  writingStatsQuerySchema,
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
  REPORT_KINDS,
  REPORT_DEFS,
  REPORT_FORMATS,
  cellText,
  docSourceSchema,
  documentSearchQuerySchema,
  entityListQuerySchema,
  isReportKind,
  packetQuerySchema,
  parseReportOptions,
  reportCreateSchema,
  reportKindInfos,
  reportToCsv,
  resolveBatchSchema,
  scenePacketSchema,
  searchQuerySchema,
  sourceParamOf,
  sourceParamSchema,
  type ReportResult,
  BATCH_WATERMARK_MAX_RECIPIENTS,
  COMBINED_EXPORT_FORMATS,
  EXPORT_CODE_PREFIX,
  JOB_EXPORT_FORMATS,
  JOB_IMPORT_FORMATS,
  exportCombinedSchema,
  exportCreateSchema,
  exportJobInputSchema,
  exportOptionsSchema,
  importCreateSchema,
  importOverSchema,
  templateImportByIdSchema,
  uploadStateRequestSchema,
  watermarkLookupSchema,
  COMPARE_MAX_PAGES,
  SNAPSHOT_NOTES_MAX,
  compareRequestSchema,
  snapshotCommentCreateSchema,
  snapshotCommentResolveSchema,
  snapshotNoteCreateSchema,
  snapshotPrefsSchema,
  versionRestoreAsCopySchema,
  ASSET_KINDS,
  ASSET_MAX_BYTES,
  ASSET_PART_SIZE_BYTES,
  ASSET_ROLES,
  ASSET_ROLE_ENTITY_KINDS,
  ASSET_ROLE_TARGETS,
  ASSET_TARGET_KINDS,
  assetCompleteSchema,
  assetExtension,
  assetLinkCreateSchema,
  assetLinkUpdateSchema,
  assetListQuerySchema,
  assetPartsRequestSchema,
  assetRightsSchema,
  assetUpdateSchema,
  assetUploadRequestSchema,
  checkAssetFile,
  ACTIVITY_KINDS,
  CHAT_BODY_MAX,
  DEVICE_PLATFORMS,
  NOTIFICATION_KINDS,
  PUSH_PLATFORMS,
  activityQuerySchema,
  chatMessageCreateSchema,
  chatMessageUpdateSchema,
  defaultNotificationKindPrefs,
  defaultNotificationPrefs,
  deviceCreateSchema,
  deviceUpdateSchema,
  mentionRefSchema,
  mergeNotificationPrefs,
  notificationPrefsSchema,
  notificationsQuerySchema,
  notificationsReadSchema,
  pushTokenSetSchema,
  workspaceActivityQuerySchema,
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
    expect(API_ROUTES.documentImport.path).toBe(
      '/projects/:pid/documents/import'
    );
    expect(API_ROUTES.documentExport.method).toBe('POST');
    expect(API_ROUTES.formatsList.path).toBe('/formats');
    expect(API_ROUTES.aiStatus.path).toBe('/ai/status');
    expect(ERROR_STATUS.UNSUPPORTED_FORMAT).toBe(400);
    expect(ERROR_STATUS.IMPORT_FAILED).toBe(400);
    expect(ERROR_STATUS.IMPORT_INVALID).toBe(422);
    expect(ERROR_STATUS.IMPORT_TOO_LARGE).toBe(413);
    expect(
      documentImportSchema.safeParse({ filename: 'a.fdx', contentB64: 'AA==' })
        .success
    ).toBe(true);
    expect(documentImportSchema.safeParse({ contentB64: 'AA==' }).success).toBe(
      false
    );
  });
});

describe('routes and fixtures', () => {
  it('route table has entries', () => {
    expect(API_ROUTES.commands.method).toBe('POST');
    expect(API_ROUTES.scenesBatch.path).toBe('/documents/:did/scenes/batch');
    expect(API_ROUTES.elementsBatch.path).toBe(
      '/documents/:did/elements/batch'
    );
    expect(
      elementsBatchRequestSchema.safeParse({
        elementIds: Array(501).fill('el_x'),
      }).success
    ).toBe(false);
    expect(
      scenesBatchRequestSchema.safeParse({ sceneIds: ['el_x'] }).success
    ).toBe(true);
    expect(
      scenesBatchRequestSchema.safeParse({ sceneIds: Array(21).fill('el_x') })
        .success
    ).toBe(false);
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
    const ok = apiKeyCreateSchema.parse({
      name: 'n',
      workspaceId: 'ws_x',
      scope: 'read',
    });
    expect(ok.ai).toBe(false);
    expect(
      apiKeyCreateSchema.safeParse({
        name: '',
        workspaceId: 'ws_x',
        scope: 'read',
      }).success
    ).toBe(false);
    expect(
      apiKeyCreateSchema.safeParse({
        name: 'n',
        workspaceId: 'ws_x',
        scope: 'admin',
      }).success
    ).toBe(false);
    expect(
      apiKeyCreateSchema.safeParse({
        name: 'n',
        workspaceId: 'ws_x',
        scope: 'read',
        expiresInDays: 366,
      }).success
    ).toBe(false);
    expect(
      apiKeyCreateSchema.safeParse({
        name: 'n',
        workspaceId: 'ws_x',
        scope: 'read',
        expiresInDays: 0,
      }).success
    ).toBe(false);
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
      for (const p of ROLE_PERMISSIONS[ROLES[i]!])
        expect(higher.has(p), `${ROLES[i - 1]} lacks ${p}`).toBe(true);
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
      if (r.permission)
        expect(known.has(r.permission), `${name}: ${r.permission}`).toBe(true);
    }
  });
});

describe('B8 routes and schemas', () => {
  it('declares the 34 routes of the slice (plus the project-parent variants)', () => {
    const have = new Set(
      Object.values(API_ROUTES).map((r) => `${r.method} ${r.path}`)
    );
    const appendix = [
      'GET /me/shared',
      'POST /workspaces',
      'PATCH /workspaces/:wid',
      'GET /workspaces/:wid/audit.csv',
      'DELETE /workspaces/:wid',
      'POST /workspaces/:wid/transfer',
      'GET /workspaces/:wid/usage',
      'GET /workspaces/:wid/members',
      'PATCH /workspaces/:wid/members/:uid',
      'DELETE /workspaces/:wid/members/:uid',
      'POST /workspaces/:wid/leave',
      'POST /workspaces/:wid/invitations',
      'POST /projects/:pid/invitations',
      'POST /documents/:did/invitations',
      'GET /workspaces/:wid/invitations',
      'GET /me/invitations',
      'POST /invitations/:iid/renew',
      'DELETE /invitations/:iid',
      'POST /invitations/accept',
      'POST /invitations/:iid/decline',
      'POST /documents/:did/lock',
      'DELETE /documents/:did/lock',
      'POST /documents/:did/unlock-session',
      'POST /snapshots/:sid/share-links',
      'GET /public/share/:token',
      'POST /share/:token/unlock',
      'GET /share/:token/state',
      'POST /documents/:did/share-links',
      'GET /documents/:did/share-links',
      'PATCH /share-links/:lid',
      'DELETE /share-links/:lid',
      'GET /documents/:did/grants',
      'PATCH /grants/:gid',
      'DELETE /grants/:gid',
    ];
    expect(appendix).toHaveLength(34);
    for (const a of appendix) expect(have.has(a), a).toBe(true);
    for (const a of [
      'POST /projects/:pid/share-links',
      'GET /projects/:pid/share-links',
      'GET /projects/:pid/grants',
    ])
      expect(have.has(a), a).toBe(true);
    expect(have.size).toBe(Object.keys(API_ROUTES).length); // no duplicate method+path
  });
  it('validates the sharing requests', () => {
    expect(
      workspaceCreateSchema.safeParse({ name: 'Writers room' }).success
    ).toBe(true);
    expect(workspaceCreateSchema.safeParse({ name: '' }).success).toBe(false);
    expect(
      workspaceCreateSchema.safeParse({ name: 'x'.repeat(81) }).success
    ).toBe(false);
    expect(workspaceTransferSchema.safeParse({}).success).toBe(false);
    expect(
      invitationCreateSchema.safeParse({ email: 'a@b.co', role: 'viewer' })
        .success
    ).toBe(true);
    expect(
      invitationCreateSchema.safeParse({ email: 'nope', role: 'viewer' })
        .success
    ).toBe(false);
    expect(
      invitationCreateSchema.safeParse({ email: 'a@b.co', role: 'boss' })
        .success
    ).toBe(false);
    const link = shareLinkCreateSchema.parse({ access: 'view' });
    expect(link).toMatchObject({
      generalAccess: 'anyone',
      allowDownload: true,
    });
    expect(shareLinkCreateSchema.safeParse({ access: 'edit' }).success).toBe(
      false
    );
    expect(
      shareLinkCreateSchema.safeParse({
        access: 'comment',
        generalAccess: 'restricted',
        expiresAt: '2030-01-01T00:00:00Z',
      }).success
    ).toBe(true);
    expect(
      shareLinkUpdateSchema.safeParse({ password: 'a', clearPassword: true })
        .success
    ).toBe(false);
    expect(
      shareLinkUpdateSchema.safeParse({
        clearPassword: true,
        allowDownload: false,
      }).success
    ).toBe(true);
    expect(shareUnlockSchema.safeParse({}).success).toBe(true);
  });
  it('projects roles onto the sync write matrix', () => {
    expect(markPermissionsFor('writer')).toEqual({
      edit: true,
      comment: true,
      highlight: true,
    });
    expect(markPermissionsFor('commenter')).toEqual({
      edit: false,
      comment: true,
      highlight: true,
    });
    expect(markPermissionsFor('viewer')).toEqual({
      edit: false,
      comment: false,
      highlight: false,
    });
    expect(markPermissionsFor('none').edit).toBe(false);
    expect(COMMENTER_WRITABLE_KEYS).toEqual(['notes']);
    expect(isCommenterMark('n:note_1')).toBe(true);
    expect(isCommenterMark('hl')).toBe(true);
    expect(isCommenterMark('bold')).toBe(false);
    expect(isCommenterMark('ins')).toBe(false);
  });
  it('the auth frame carries an optional unlock token and the link scheme', () => {
    const base = {
      scheme: 'link',
      token: 'fls_x',
      deviceId: 'd',
      installId: 'i',
      clientVersion: '1',
      schemaVersion: 1,
    };
    expect(
      syncFrameSchema.safeParse({ channelId: 0, type: 'auth', payload: base })
        .success
    ).toBe(true);
    expect(
      syncFrameSchema.safeParse({
        channelId: 0,
        type: 'auth',
        payload: { ...base, unlockToken: 'u' },
      }).success
    ).toBe(true);
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
    expect(jobCreateSchema.safeParse({ kind: 'nope.kind' }).success).toBe(
      false
    );
    expect(
      jobCreateSchema.safeParse({ kind: 'test.echo', idempotencyKey: '' })
        .success
    ).toBe(false);
    expect(
      jobCreateSchema.safeParse({
        kind: 'test.echo',
        idempotencyKey: 'k'.repeat(129),
      }).success
    ).toBe(false);
    expect(
      jobListQuerySchema.safeParse({ kind: 'ai.', status: 'running' }).success
    ).toBe(true);
    expect(jobListQuerySchema.safeParse({ status: 'done' }).success).toBe(
      false
    );
    expect(jobGetQuerySchema.parse({ wait: '30' }).wait).toBe(30);
    expect(jobGetQuerySchema.safeParse({ wait: '121' }).success).toBe(false);
  });
});

describe('B10 reads, search, reports, packets', () => {
  it('declares the 28 routes with their paths, auth and permissions', () => {
    const b10 = [
      'entitiesList',
      'entityGet',
      'entityUsage',
      'entityDialogue',
      'tagCategoriesList',
      'tagsList',
      'notesList',
      'beatsList',
      'binList',
      'revisionsGet',
      'changesList',
      'alternatesGet',
      'titlePageGet',
      'statsGet',
      'fountainGet',
      'sceneShotsList',
      'resolveBatch',
      'resolveOne',
      'documentSearch',
      'workspaceSearch',
      'search',
      'reportKinds',
      'reportGet',
      'reportCreate',
      'packetScene',
      'packetCharacter',
      'packetLocation',
      'packetShot',
    ] as const;
    expect(b10.length).toBe(28);
    for (const k of b10) expect(API_ROUTES[k], k).toBeTruthy();
    expect(API_ROUTES.entityUsage).toMatchObject({
      method: 'GET',
      path: '/documents/:did/entities/:eid/usage',
      permission: 'document.read',
    });
    expect(API_ROUTES.reportCreate).toMatchObject({
      method: 'POST',
      permission: 'reports.run',
    });
    expect(API_ROUTES.packetScene.path).toBe(
      '/documents/:did/packets/scene/:locator'
    );
    expect(API_ROUTES.search).toMatchObject({
      path: '/search',
      permission: null,
    });
    expect(
      new Set(b10.map((k) => `${API_ROUTES[k].method} ${API_ROUTES[k].path}`))
        .size
    ).toBe(28);
  });

  it('error codes: report kind unavailable, entity in use, variant in use', () => {
    expect(ERROR_STATUS.REPORT_KIND_UNAVAILABLE).toBe(501);
    expect(ERROR_STATUS.REPORT_OPTIONS_INVALID).toBe(400);
    expect(ERROR_STATUS.ENTITY_IN_USE).toBe(409);
    expect(ERROR_STATUS.VARIANT_IN_USE).toBe(409);
    expect(ERROR_STATUS.LOCATOR_AMBIGUOUS).toBe(409);
    expect(ERROR_STATUS.LOCATOR_NOT_FOUND).toBe(404);
    expect(ERROR_STATUS.INVALID_LOCATOR).toBe(400);
  });

  it('?source= is live, snapshot:<id> or version:<id>', () => {
    for (const ok of ['live', 'snapshot:snap_01ABC', 'version:ver_01ABC'])
      expect(sourceParamSchema.safeParse(ok).success, ok).toBe(true);
    for (const bad of ['', 'snapshot:', 'other', 'snapshot:a b'])
      expect(sourceParamSchema.safeParse(bad).success, bad).toBe(false);
    expect(sourceParamOf({ kind: 'live' })).toBeUndefined();
    expect(sourceParamOf({ kind: 'snapshot', snapshotId: 'snap_1' })).toBe(
      'snapshot:snap_1'
    );
    expect(sourceParamOf({ kind: 'version', versionId: 'ver_1' })).toBe(
      'version:ver_1'
    );
    expect(docSourceSchema.safeParse({ kind: 'snapshot' }).success).toBe(false);
  });

  it('query and body schemas', () => {
    expect(entityListQuerySchema.parse({}).limit).toBe(50);
    expect(
      searchQuerySchema.parse({
        q: 'x',
        types: 'scene,element',
        styleIds: 'st_a,st_b',
      })
    ).toMatchObject({
      types: ['scene', 'element'],
      styleIds: ['st_a', 'st_b'],
    });
    expect(searchQuerySchema.safeParse({ q: '' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: 'x'.repeat(201) }).success).toBe(
      false
    );
    expect(searchQuerySchema.safeParse({ q: 'x', types: 'nope' }).success).toBe(
      false
    );
    expect(documentSearchQuerySchema.parse({ q: 'a' })).toMatchObject({
      mode: 'text',
      limit: 50,
    });
    expect(
      documentSearchQuerySchema.safeParse({ q: 'a', limit: '101' }).success
    ).toBe(false);
    expect(
      resolveBatchSchema.safeParse({
        locators: Array.from({ length: 200 }, () => '#1'),
      }).success
    ).toBe(true);
    expect(
      resolveBatchSchema.safeParse({
        locators: Array.from({ length: 201 }, () => '#1'),
      }).success
    ).toBe(false);
    expect(resolveBatchSchema.safeParse({ locators: [] }).success).toBe(false);
    expect(
      packetQuerySchema.parse({ include: 'neighbors,-script' }).include
    ).toEqual(['neighbors', '-script']);
    expect(packetQuerySchema.safeParse({ include: 'bogus' }).success).toBe(
      false
    );
    expect(reportCreateSchema.parse({ kind: 'scene' })).toMatchObject({
      format: 'json',
      options: {},
    });
    expect(reportCreateSchema.safeParse({ kind: 'nope' }).success).toBe(false);
    expect(
      reportCreateSchema.safeParse({ kind: 'scene', format: 'docx' }).success
    ).toBe(false);
  });

  it('REPORT_KINDS is the 18 spec kinds in order; every kind has a declaration, columns and unique option names', () => {
    expect(REPORT_KINDS.length).toBe(18);
    expect(REPORT_KINDS[0]).toBe('scene');
    expect(REPORT_KINDS[17]).toBe('characterArcs');
    expect(REPORT_FORMATS).toEqual(['json', 'csv', 'pdf', 'html']);
    for (const k of REPORT_KINDS) {
      const d = REPORT_DEFS[k];
      expect(d.featureId, k).toMatch(/^F-RPT-0\d\d$/);
      expect(d.columns.length, k).toBeGreaterThan(0);
      expect(new Set(d.columns.map((c) => c.id)).size, k).toBe(
        d.columns.length
      );
      expect(new Set(d.options.map((o) => o.name)).size, k).toBe(
        d.options.length
      );
      expect(isReportKind(k)).toBe(true);
    }
    expect(isReportKind('nope')).toBe(false);
    const infos = reportKindInfos();
    expect(infos.filter((i) => !i.available).map((i) => i.kind)).toEqual([
      'structure',
    ]);
    expect(
      infos.find((i) => i.kind === 'structure')!.unavailableReason
    ).toBeTruthy();
  });

  it('parseReportOptions defaults, validates and refuses unknown keys', () => {
    expect(parseReportOptions('scene', {})).toEqual({
      ok: true,
      options: { sort: 'scriptOrder', includeOmitted: false },
    });
    expect(parseReportOptions('scene', undefined)).toMatchObject({ ok: true });
    expect(parseReportOptions('scene', { sort: 'sceneNumber' })).toMatchObject({
      ok: true,
      options: { sort: 'sceneNumber' },
    });
    const bad = parseReportOptions('scene', {
      sort: 'x',
      nope: 1,
      includeOmitted: 'yes',
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok)
      expect(bad.issues.map((i) => i.path).sort()).toEqual([
        'includeOmitted',
        'nope',
        'sort',
      ]);
    expect(parseReportOptions('text', {}).ok).toBe(false); // q is required
    expect(parseReportOptions('text', { q: 'x' })).toMatchObject({
      ok: true,
      options: { mode: 'text', styles: [] },
    });
    expect(parseReportOptions('character', { monologueWords: 0 }).ok).toBe(
      false
    );
    expect(parseReportOptions('character', { characters: ['a', 1] }).ok).toBe(
      false
    );
    expect(parseReportOptions('scene', [] as never).ok).toBe(false);
  });

  it('reportToCsv quotes fields, joins tables with a blank line and appends the footer', () => {
    const r: ReportResult = {
      kind: 'scene',
      title: 't',
      documentId: 'doc_1',
      source: 'live',
      options: {},
      tables: [
        {
          id: 'a',
          title: 'A',
          columns: [
            { id: 'x', label: 'X' },
            { id: 'y', label: 'Y, why' },
          ],
          rows: [
            { x: 'he said "hi"', y: 2 },
            { x: 'line\nbreak', y: null },
          ],
          footer: { x: 'Total', y: 2 },
        },
        { id: 'b', title: 'B', columns: [{ id: 'z', label: 'Z' }], rows: [] },
      ],
    };
    expect(reportToCsv(r)).toBe(
      'A\r\nX,"Y, why"\r\n"he said ""hi""",2\r\n"line\nbreak",\r\nTotal,2\r\n\r\nB\r\nZ\r\n'
    );
    expect(cellText(null)).toBe('');
    expect(cellText(0)).toBe('0');
  });

  it('packet schemas accept a minimal scene packet and refuse a wrong packetVersion', () => {
    const packet = {
      packetVersion: 1,
      kind: 'scene',
      documentId: 'doc_1',
      documentTitle: 'T',
      snapshotId: null,
      templateId: 'tpl',
      language: 'en',
      generatedAt: 'now',
      hash: 'v1:x',
      body: {
        scene: {
          id: 'el_1',
          number: '1',
          ordinal: 0,
          omitted: false,
          heading: {
            raw: 'INT. A - DAY',
            intro: 'INT.',
            location: 'A',
            time: 'DAY',
          },
          locationEntityId: null,
          synopsis: '',
          color: null,
          pages: null,
          estimatedDurationMs: 0,
          folders: [],
          contentHash: 'v1:y',
          scriptDay: null,
        },
        script: [
          { id: 'el_1', type: 'sceneHeading', text: 'INT. A - DAY' },
          {
            id: 'el_2',
            type: 'dialogue',
            text: 'Hi',
            speakerEntityId: null,
            dual: false,
            lineIndex: 1,
          },
        ],
        cast: [],
        location: null,
        elements: [],
        shots: [],
        notes: [],
        sceneAssets: [],
      },
    };
    expect(scenePacketSchema.safeParse(packet).success).toBe(true);
    expect(
      scenePacketSchema.safeParse({ ...packet, packetVersion: 2 }).success
    ).toBe(false);
    expect(
      scenePacketSchema.safeParse({ ...packet, kind: 'character' }).success
    ).toBe(false);
  });
});

describe('B13 account and per-user data', () => {
  it('declares the 19 routes; only the macro list is open to a read key', () => {
    const b13 = [
      'meDictionaryGet',
      'meDictionaryUpdate',
      'mePreferencesGet',
      'mePreferencesSet',
      'meMacrosList',
      'meMacroCreate',
      'meMacroUpdate',
      'meMacroDelete',
      'meWritingStats',
      'meWritingSessionCreate',
      'meWritingGoalsGet',
      'meWritingGoalsSet',
      'meExport',
      'meDelete',
      'meRestore',
      'documentMyStateGet',
      'documentMyStateSet',
      'documentStar',
      'documentUnstar',
    ] as const;
    expect(b13.length).toBe(19);
    expect(
      new Set(b13.map((k) => `${API_ROUTES[k].method} ${API_ROUTES[k].path}`))
        .size
    ).toBe(19);
    expect(API_ROUTES.mePreferencesSet).toMatchObject({
      method: 'PUT',
      path: '/me/preferences',
      auth: 'U',
    });
    expect(API_ROUTES.meDelete).toMatchObject({
      method: 'DELETE',
      path: '/me',
    });
    expect(API_ROUTES.documentMyStateSet).toMatchObject({
      method: 'PUT',
      permission: 'document.read',
    });
    expect(API_ROUTES.documentStar.permission).toBe('document.read');
    expect(b13.filter((k) => API_ROUTES[k].auth.includes('K'))).toEqual([
      'meMacrosList',
    ]);
  });

  it('error codes: STALE_WRITE is 409, the others exist', () => {
    expect(ERROR_STATUS.STALE_WRITE).toBe(409);
    expect(ERROR_STATUS.OWNS_TEAM_WORKSPACE).toBe(409);
    expect(ERROR_STATUS.REAUTH_REQUIRED).toBe(401);
    expect(ERROR_STATUS.MACRO_TRIGGER_TAKEN).toBe(409);
    expect(ERROR_STATUS.LIMIT_EXCEEDED).toBe(409);
  });

  it('preferences are closed at the top level and open inside a section', () => {
    expect(userPreferencesSchema.parse({}).version).toBe(1);
    expect(
      userPreferencesSchema.safeParse({
        editor: { guessNextCharacter: true, anythingElse: 1 },
      }).success
    ).toBe(true);
    expect(userPreferencesSchema.safeParse({ unknownKey: 1 }).success).toBe(
      false
    );
    expect(
      userPreferencesSchema.safeParse({ appearance: { theme: 'neon' } }).success
    ).toBe(false);
    expect(
      userPreferencesSchema.safeParse({
        recentSearches: Array.from({ length: 21 }, () => 'x'),
      }).success
    ).toBe(false);
    expect(userPreferencesPutSchema.safeParse({ editor: {} }).success).toBe(
      false
    ); // baseUpdatedAt is required
    expect(
      userPreferencesPutSchema.safeParse({
        editor: {},
        baseUpdatedAt: '2026-09-21T10:00:00.000Z',
      }).success
    ).toBe(true);
  });

  it('dictionary, macros, sessions, goals, stats, delete', () => {
    expect(dictionaryUpdateSchema.parse({ add: [' foo '] }).add).toEqual([
      'foo',
    ]);
    expect(dictionaryUpdateSchema.safeParse({ add: [''] }).success).toBe(false);
    const m = userMacroSchema.parse({
      name: 'sig',
      trigger: { kind: 'alias', value: 'ty' },
      insertText: 'Thank you',
    });
    expect(m.options).toEqual({
      smartReplace: false,
      confirm: false,
      wordOnly: true,
      matchCase: false,
      activeInStyles: [],
    });
    expect(
      userMacroSchema.safeParse({
        name: 'x',
        trigger: { kind: 'key', value: 'y' },
        insertText: '',
      }).success
    ).toBe(false);
    expect(
      userMacroPatchSchema.safeParse({ options: { confirm: true } }).success
    ).toBe(true);
    const session = {
      clientSessionId: 'wss_0123456789',
      documentId: 'doc_1',
      startedAt: '2026-09-20T10:00:00Z',
      endedAt: '2026-09-20T10:30:00Z',
      activeSeconds: 1500,
      wordsAdded: 400,
      wordsRemoved: 20,
      netPagesEighths: 3,
    };
    expect(writingSessionSchema.safeParse(session).success).toBe(true);
    expect(
      writingSessionSchema.safeParse({
        ...session,
        endedAt: '2026-09-20T09:00:00Z',
      }).success
    ).toBe(false);
    expect(
      writingSessionSchema.safeParse({ ...session, clientSessionId: 'a b' })
        .success
    ).toBe(false);
    expect(
      writingGoalsPutSchema.safeParse({
        goals: [{ kind: 'wordsPerDay', target: 500, daysOfWeek: [1, 2] }],
      }).success
    ).toBe(true);
    expect(
      writingGoalsPutSchema.safeParse({
        goals: [{ kind: 'documentTarget', target: 100 }],
      }).success
    ).toBe(false);
    expect(
      writingGoalsPutSchema.safeParse({
        goals: Array.from({ length: 51 }, () => ({
          kind: 'wordsPerDay',
          target: 1,
        })),
      }).success
    ).toBe(true); // the 50 limit is the server's LIMIT_EXCEEDED
    expect(writingStatsQuerySchema.parse({}).granularity).toBe('day');
    expect(
      writingStatsQuerySchema.safeParse({ from: '2026/09/01' }).success
    ).toBe(false);
    expect(accountDeleteSchema.safeParse({ confirm: 'DELETE' }).success).toBe(
      true
    );
    expect(accountDeleteSchema.safeParse({ confirm: 'delete' }).success).toBe(
      false
    );
  });

  it('view state is closed at the top level; baseUpdatedAt may be null', () => {
    expect(
      documentViewStatePutSchema.safeParse({
        navigator: { tabs: [{ id: 'scenes' }], activeTab: 'scenes' },
        baseUpdatedAt: null,
      }).success
    ).toBe(true);
    expect(
      documentViewStatePutSchema.safeParse({
        views: { desktop: { view: 'pages', zoom: 1.25 } },
      }).success
    ).toBe(true);
    expect(
      documentViewStatePutSchema.safeParse({ views: { watch: {} } }).success
    ).toBe(false);
    expect(documentViewStatePutSchema.safeParse({ caret: 5 }).success).toBe(
      false
    );
  });
});

describe('B14 lifecycle and workspace settings', () => {
  it('registers the 27 routes with the spec paths', () => {
    const b14 = [
      ['workspaceDocuments', 'GET', '/workspaces/:wid/documents'],
      ['workspaceTrash', 'GET', '/workspaces/:wid/trash'],
      ['workspaceTrashEmpty', 'POST', '/workspaces/:wid/trash/empty'],
      ['projectPurge', 'DELETE', '/projects/:pid'],
      ['projectDuplicate', 'POST', '/projects/:pid/duplicate'],
      ['projectFolderCreate', 'POST', '/projects/:pid/folders'],
      ['projectFolderUpdate', 'PATCH', '/project-folders/:fid'],
      ['projectFolderDelete', 'DELETE', '/project-folders/:fid'],
      ['documentMove', 'POST', '/documents/:did/move'],
      ['documentPurge', 'DELETE', '/documents/:did'],
      ['documentDuplicate', 'POST', '/documents/:did/duplicate'],
      ['documentApplyTemplate', 'POST', '/documents/:did/template'],
      ['templateCreate', 'POST', '/templates'],
      ['templateVersionCreate', 'POST', '/templates/:tid/versions'],
      ['templateUpdate', 'PATCH', '/templates/:tid'],
      ['templateDelete', 'DELETE', '/templates/:tid'],
      ['templateImport', 'POST', '/templates/import'],
      ['templateExport', 'GET', '/templates/:tid/export'],
      ['projectBinList', 'GET', '/projects/:pid/bin'],
      ['projectBinCreate', 'POST', '/projects/:pid/bin'],
      ['projectBinDelete', 'DELETE', '/project-bin-items/:id'],
      ['workspaceDefaultsGet', 'GET', '/workspaces/:wid/defaults'],
      ['workspaceDefaultsSet', 'PUT', '/workspaces/:wid/defaults'],
      ['workspaceContactsList', 'GET', '/workspaces/:wid/contacts'],
      ['workspaceContactsCreate', 'POST', '/workspaces/:wid/contacts'],
      ['workspaceContactUpdate', 'PATCH', '/workspace-contacts/:cid'],
      ['workspaceContactDelete', 'DELETE', '/workspace-contacts/:cid'],
    ] as const;
    for (const [name, method, path] of b14) {
      expect(API_ROUTES[name].method, name).toBe(method);
      expect(API_ROUTES[name].path, name).toBe(path);
    }
    expect(b14).toHaveLength(27);
    // user-only routes carry no key marker
    for (const n of [
      'projectPurge',
      'documentPurge',
      'workspaceTrashEmpty',
      'workspaceDefaultsSet',
      'workspaceContactsList',
    ] as const) {
      expect(API_ROUTES[n].auth, n).toBe('U');
    }
    expect(ERROR_STATUS.FOLDER_DEPTH).toBe(409);
    expect(ERROR_STATUS.FOLDER_CYCLE).toBe(409);
    expect(ERROR_STATUS.MOVE_FORBIDDEN).toBe(403);
    expect(ERROR_STATUS.UNMAPPED_STYLES).toBe(422);
    expect(ERROR_STATUS.BUILTIN_IMMUTABLE).toBe(409);
    expect(ERROR_STATUS.TEMPLATE_INVALID).toBe(422);
    expect(ERROR_STATUS.NOT_IN_TRASH).toBe(409);
    expect(ERROR_STATUS.STALE_WRITE).toBe(409);
  });

  it('projects and documents: kind, labels, numbering', () => {
    expect(PROJECT_KINDS).toEqual(['feature', 'series', 'play', 'other']);
    expect(
      projectCreateSchema.parse({ name: 'Show', kind: 'series', logline: 'x' })
        .kind
    ).toBe('series');
    expect(
      projectCreateSchema.safeParse({ name: 'Show', kind: 'movie' }).success
    ).toBe(false);
    expect(
      documentUpdateSchema.safeParse({ season: 1, episode: 2, labels: ['a'] })
        .success
    ).toBe(true);
    expect(
      documentUpdateSchema.safeParse({ season: null, episode: null }).success
    ).toBe(true);
    expect(documentUpdateSchema.safeParse({ season: 1.5 }).success).toBe(false);
    expect(
      documentUpdateSchema.safeParse({
        labels: Array.from(
          { length: DOCUMENT_LABELS_MAX + 1 },
          (_, i) => `l${i}`
        ),
      }).success
    ).toBe(false);
    expect(
      documentUpdateSchema.safeParse({ labels: ['x'.repeat(41)] }).success
    ).toBe(false);
    expect(documentUpdateSchema.safeParse({ labels: [''] }).success).toBe(
      false
    );
    expect(documentListQuerySchema.parse({ order: 'episode' }).order).toBe(
      'episode'
    );
    expect(documentListQuerySchema.safeParse({ order: 'random' }).success).toBe(
      false
    );
  });

  it('folders, move, duplicate, apply template, purge', () => {
    expect(FOLDER_MAX_DEPTH).toBe(8);
    expect(projectFolderCreateSchema.safeParse({ name: ' ' }).success).toBe(
      false
    );
    expect(
      projectFolderUpdateSchema.safeParse({ parentFolderId: null, position: 2 })
        .success
    ).toBe(true);
    expect(
      documentMoveSchema.safeParse({ targetProjectId: 'prj_x', folderId: null })
        .success
    ).toBe(true);
    expect(documentMoveSchema.safeParse({}).success).toBe(false);
    expect(documentDuplicateSchema.parse({ title: 'Copy' })).toEqual({
      title: 'Copy',
      includeSnapshots: false,
      includeAssets: false,
    });
    expect(projectDuplicateSchema.parse({ name: 'Copy' })).toMatchObject({
      includeSnapshots: false,
    });
    expect(
      documentApplyTemplateSchema.safeParse({
        templateId: 'tpl_x',
        mapping: { st_a: 'st_b' },
        dryRun: true,
      }).success
    ).toBe(true);
    expect(documentApplyTemplateSchema.safeParse({ mapping: {} }).success).toBe(
      false
    );
    expect(projectPurgeSchema.safeParse({ confirmName: 'x' }).success).toBe(
      true
    );
    expect(projectPurgeSchema.safeParse({}).success).toBe(false);
    // the confirmation word is the server's CONFIRMATION_MISMATCH, so any string passes the schema
    expect(trashEmptySchema.safeParse({ confirm: 'nope' }).success).toBe(true);
    expect(TRASH_RETENTION_DAYS).toBe(30);
  });

  it('workspace documents query coerces booleans', () => {
    const q = workspaceDocumentsQuerySchema.parse({
      starred: 'true',
      trashed: 'false',
      label: 'pilot',
      q: 'x',
      limit: '10',
    });
    expect(q).toMatchObject({
      starred: true,
      trashed: false,
      label: 'pilot',
      limit: 10,
    });
    expect(
      workspaceDocumentsQuerySchema.safeParse({ starred: 'yes' }).success
    ).toBe(false);
    expect(workspaceDocumentsQuerySchema.parse({}).limit).toBe(50);
  });

  it('templates: create, import, export, update', () => {
    expect(
      templateCreateSchema.safeParse({ scope: 'user', template: {} }).success
    ).toBe(true);
    expect(
      templateCreateSchema.safeParse({ scope: 'workspace', template: {} })
        .success
    ).toBe(false); // needs a workspace
    expect(
      templateCreateSchema.safeParse({
        scope: 'workspace',
        workspaceId: 'ws_x',
        template: {},
      }).success
    ).toBe(true);
    expect(
      templateCreateSchema.safeParse({ scope: 'builtin', template: {} }).success
    ).toBe(false);
    expect(
      templateCreateSchema.safeParse({ scope: 'user', template: 'nope' })
        .success
    ).toBe(false);
    expect(
      templateImportSchema.safeParse({
        scope: 'user',
        filename: 'a.fwtemplate.json',
        contentB64: 'AA==',
      }).success
    ).toBe(true);
    expect(
      templateImportSchema.safeParse({
        scope: 'workspace',
        filename: 'a',
        contentB64: 'AA==',
      }).success
    ).toBe(false);
    expect(templateExportQuerySchema.parse({}).format).toBe('fwtemplate');
    expect(
      templateExportQuerySchema.parse({ format: 'fdxt', version: '2' })
    ).toEqual({ format: 'fdxt', version: 2 });
    expect(templateUpdateSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('bin, defaults and contacts', () => {
    expect(PROJECT_BIN_ITEM_MAX_BYTES).toBe(2 * 1024 * 1024);
    expect(
      projectBinCreateSchema.safeParse({ elements: [{ style: 'st_action' }] })
        .success
    ).toBe(true);
    expect(projectBinCreateSchema.safeParse({ elements: [] }).success).toBe(
      false
    );
    expect(
      projectBinCreateSchema.safeParse({ id: 'doc_1', elements: [{}] }).success
    ).toBe(false);
    const d = workspaceDefaultsSchema.parse({});
    expect(d).toEqual({
      tagCategories: [],
      revisionColourSets: [],
      noteTypes: [],
      worksheets: [],
      defaultProjectRole: null,
    });
    expect(
      workspaceDefaultsPutSchema.safeParse({
        baseUpdatedAt: '2026-01-01T00:00:00Z',
        defaultProjectRole: 'writer',
      }).success
    ).toBe(true);
    expect(
      workspaceDefaultsPutSchema.safeParse({ defaultProjectRole: 'writer' })
        .success
    ).toBe(false);
    expect(
      workspaceDefaultsPutSchema.safeParse({
        baseUpdatedAt: 'x',
        defaultProjectRole: 'owner',
      }).success
    ).toBe(false);
    expect(
      workspaceContactsCreateSchema.safeParse({
        contacts: [{ name: 'A', email: null }],
      }).success
    ).toBe(true);
    expect(
      workspaceContactsCreateSchema.safeParse({ contacts: [] }).success
    ).toBe(false);
    expect(
      workspaceContactsCreateSchema.safeParse({
        contacts: [{ id: 'x_1', name: 'A' }],
      }).success
    ).toBe(false);
    expect(
      workspaceContactPatchSchema.safeParse({ company: null }).success
    ).toBe(true);
    expect(workspaceContactsQuerySchema.parse({ q: 'a' })).toMatchObject({
      q: 'a',
      limit: 50,
    });
    expect(
      workspaceUpdateSchema.safeParse({ allowPublicLinks: false }).success
    ).toBe(true);
    expect(makeWorkspace().allowPublicLinks).toBe(true);
    expect(makeProject().kind).toBe('feature');
    expect(makeDocumentMeta()).toMatchObject({
      labels: [],
      season: null,
      episode: null,
    });
  });
});

describe('B16 imports, exports and watermark', () => {
  const sha = 'a'.repeat(64);
  it('declares the 7 routes with the spec permissions and key policy', () => {
    const have = (n: keyof typeof API_ROUTES) =>
      `${API_ROUTES[n].method} ${API_ROUTES[n].path}`;
    expect(
      (
        [
          'uploadState',
          'importCreate',
          'importStart',
          'documentImportOver',
          'documentExportCreate',
          'documentExportCombined',
          'watermarkLookup',
        ] as const
      ).map(have)
    ).toEqual([
      'POST /uploads/state',
      'POST /imports',
      'POST /imports/:importId/start',
      'POST /documents/:did/import-over',
      'POST /documents/:did/exports',
      'POST /documents/export-combined',
      'POST /workspaces/:wid/watermark-lookup',
    ]);
    expect(API_ROUTES.watermarkLookup).toMatchObject({
      auth: 'U',
      permission: 'workspace.audit',
    });
    expect(API_ROUTES.documentExportCreate.auth).toBe('U,Kr');
    expect(API_ROUTES.importCreate.auth).toBe('U,Krw');
    // the synchronous routes are still there until the app migrates
    expect(API_ROUTES.documentImport.path).toBe(
      '/projects/:pid/documents/import'
    );
  });
  it('job kinds and error codes', () => {
    for (const k of [
      'import.fountain',
      'import.fdx',
      'import.fadein',
      'import.ocr',
      'export.fountain',
      'export.fdx',
      'export.json',
      'watermark.batch',
      'doc.importOver',
    ]) {
      expect(JOB_KINDS as readonly string[]).toContain(k);
    }
    expect(JOB_IMPORT_FORMATS).toEqual(['fountain', 'fdx', 'fadein']);
    expect(JOB_EXPORT_FORMATS).toEqual(['fountain', 'fdx', 'json']);
    expect(COMBINED_EXPORT_FORMATS).toEqual(['fdx', 'fountain']);
    expect(ERROR_STATUS.IMPORT_FORMAT_UNSUPPORTED).toBe(415);
    expect(ERROR_STATUS.EXPORT_FORMAT_UNSUPPORTED).toBe(415);
    expect(ERROR_STATUS.OCR_UNAVAILABLE).toBe(503);
    expect(ERROR_STATUS.WATERMARK_NOT_FOUND).toBe(404);
    expect(ERROR_STATUS.UPLOAD_INCOMPLETE).toBe(409);
    expect(ERROR_STATUS.DOCUMENT_BUSY).toBe(409);
    expect(EXPORT_CODE_PREFIX).toBe('FWX-');
  });
  it('validates uploads and imports', () => {
    expect(
      uploadStateRequestSchema.parse({ sizeBytes: 3, sha256Hex: sha }).purpose
    ).toBe('state');
    expect(
      uploadStateRequestSchema.safeParse({ sizeBytes: 0, sha256Hex: sha })
        .success
    ).toBe(false);
    expect(
      uploadStateRequestSchema.safeParse({ sizeBytes: 3, sha256Hex: 'zz' })
        .success
    ).toBe(false);
    expect(
      uploadStateRequestSchema.safeParse({
        sizeBytes: 3,
        sha256Hex: sha,
        purpose: 'import',
      }).success
    ).toBe(false);
    const file = { filename: 'a.fdx', sizeBytes: 10, sha256Hex: sha };
    expect(
      importCreateSchema.safeParse({ targetProjectId: 'prj_1', ...file })
        .success
    ).toBe(true);
    expect(
      importCreateSchema.parse({
        targetProjectId: 'prj_1',
        ...file,
        options: {},
      }).options?.ocr
    ).toBe('auto');
    expect(importCreateSchema.safeParse({ ...file }).success).toBe(false);
    expect(
      importCreateSchema.safeParse({
        targetProjectId: 'prj_1',
        templateTarget: { scope: 'user' },
        ...file,
      }).success
    ).toBe(false);
    expect(
      importCreateSchema.safeParse({
        templateTarget: { scope: 'workspace' },
        ...file,
      }).success
    ).toBe(false);
    expect(
      importCreateSchema.safeParse({
        templateTarget: { scope: 'user' },
        ...file,
      }).success
    ).toBe(true);
    expect(
      importCreateSchema.safeParse({
        targetProjectId: 'prj_1',
        ...file,
        options: { ocr: 'sometimes' },
      }).success
    ).toBe(false);
    expect(importOverSchema.safeParse(file).success).toBe(true);
    expect(
      templateImportByIdSchema.safeParse({ importId: 'upl_1' }).success
    ).toBe(true);
  });
  it('validates exports, batch watermark and lookups', () => {
    expect(exportCreateSchema.safeParse({ format: 'fountain' }).success).toBe(
      true
    );
    expect(
      exportCreateSchema.safeParse({
        format: 'fdx',
        source: { kind: 'snapshot', snapshotId: 'snap_1' },
      }).success
    ).toBe(true);
    expect(
      exportCreateSchema.safeParse({ format: 'fdx', source: { kind: 'nope' } })
        .success
    ).toBe(false);
    const batch = exportOptionsSchema.parse({
      batchWatermark: { recipients: [{ name: 'A' }] },
    }).batchWatermark!;
    expect(batch).toMatchObject({ invisible: false, deliver: 'download' });
    expect(
      exportOptionsSchema.safeParse({ batchWatermark: { recipients: [] } })
        .success
    ).toBe(false);
    const many = Array.from(
      { length: BATCH_WATERMARK_MAX_RECIPIENTS + 1 },
      (_, i) => ({ name: `r${i}` })
    );
    expect(
      exportOptionsSchema.safeParse({ batchWatermark: { recipients: many } })
        .success
    ).toBe(false);
    expect(
      exportCombinedSchema.safeParse({ documentIds: ['doc_1'], format: 'fdx' })
        .success
    ).toBe(true);
    expect(
      exportCombinedSchema.safeParse({ documentIds: [], format: 'fdx' }).success
    ).toBe(false);
    expect(exportJobInputSchema.safeParse({ format: 'pdf' }).success).toBe(
      false
    );
    expect(
      watermarkLookupSchema.safeParse({ exportId: 'ABCDEFGHIJKL' }).success
    ).toBe(true);
    expect(
      watermarkLookupSchema.safeParse({ pdfUploadKey: 'upl_1' }).success
    ).toBe(true);
    expect(watermarkLookupSchema.safeParse({}).success).toBe(false);
    expect(
      watermarkLookupSchema.safeParse({
        exportId: 'ABCDEFGHIJKL',
        pdfUploadKey: 'upl_1',
      }).success
    ).toBe(false);
  });
});

describe('B15 versions, snapshots and sync completion', () => {
  it('registers the 11 routes with the spec paths', () => {
    const b15 = [
      ['elementHistory', 'GET', '/documents/:did/elements/:elementId/history'],
      ['documentPresence', 'GET', '/documents/:did/presence'],
      [
        'versionRestoreAsCopy',
        'POST',
        '/documents/:did/versions/:vid/restore-as-copy',
      ],
      ['snapshotPrefs', 'PUT', '/snapshots/:sid/prefs'],
      ['snapshotNotesList', 'GET', '/snapshots/:sid/notes'],
      ['snapshotNoteCreate', 'POST', '/snapshots/:sid/notes'],
      ['snapshotCommentsList', 'GET', '/snapshots/:sid/comments'],
      ['snapshotCommentCreate', 'POST', '/snapshots/:sid/comments'],
      [
        'snapshotCommentCopyToLive',
        'POST',
        '/snapshot-comments/:cid/copy-to-live',
      ],
      ['snapshotCommentResolve', 'POST', '/snapshot-comments/:cid/resolve'],
      ['documentCompare', 'POST', '/documents/:did/compare'],
    ] as const;
    for (const [name, method, path] of b15) {
      expect(API_ROUTES[name].method, name).toBe(method);
      expect(API_ROUTES[name].path, name).toBe(path);
    }
    expect(b15).toHaveLength(11);
    expect(API_ROUTES.snapshotPrefs.permission).toBe('snapshot.hideForSelf');
    expect(API_ROUTES.versionRestoreAsCopy.permission).toBe(
      'version.restoreAsCopy'
    );
  });
  it('validates snapshot create with a client state, prefs, notes and comments', () => {
    expect(
      snapshotCreateSchema.safeParse({
        name: 'Offline',
        kind: 'auto',
        autoReason: 'offline-edits',
        sourceEpoch: 0,
        state: { uploadKey: 'upl_1' },
      }).success
    ).toBe(true);
    expect(
      snapshotCreateSchema.safeParse({ name: 'x', state: {} }).success
    ).toBe(false);
    expect(snapshotPrefsSchema.safeParse({ hidden: true }).success).toBe(true);
    expect(snapshotPrefsSchema.safeParse({}).success).toBe(false);
    expect(
      snapshotNoteCreateSchema.safeParse({ body: 'why this branch' }).success
    ).toBe(true);
    expect(snapshotNoteCreateSchema.safeParse({ body: '   ' }).success).toBe(
      false
    );
    expect(
      snapshotNoteCreateSchema.safeParse({ body: 'x'.repeat(2001) }).success
    ).toBe(false);
    expect(SNAPSHOT_NOTES_MAX).toBe(200);
    const ok = {
      anchor: { elementId: 'el_1', offset: 0, length: 4 },
      body: 'tighten this',
    };
    expect(snapshotCommentCreateSchema.safeParse(ok).success).toBe(true);
    expect(
      snapshotCommentCreateSchema.safeParse({
        ...ok,
        anchor: { elementId: 'el_1', offset: -1, length: 4 },
      }).success
    ).toBe(false);
    expect(
      snapshotCommentCreateSchema.safeParse({ ...ok, body: 'x'.repeat(10_001) })
        .success
    ).toBe(false);
    expect(
      snapshotCommentResolveSchema.safeParse({ resolved: false }).success
    ).toBe(true);
    expect(
      versionRestoreAsCopySchema.safeParse({ title: 'Copy of v3' }).success
    ).toBe(true);
    expect(versionRestoreAsCopySchema.safeParse({ title: '' }).success).toBe(
      false
    );
  });
  it('validates compare requests and applies defaults', () => {
    const r = compareRequestSchema.parse({
      base: { kind: 'snapshot', snapshotId: 'snap_1' },
      target: { kind: 'live', documentId: 'doc_1' },
    });
    expect(r).toMatchObject({
      granularity: 'element',
      ignoreFormatting: false,
      ignoreRevisionMarks: false,
      ignoreTrackedChanges: 'as-marked',
    });
    expect(
      compareRequestSchema.safeParse({
        base: { kind: 'live', documentId: 'd' },
        target: { kind: 'version', documentId: 'd' },
      }).success
    ).toBe(false);
    expect(
      compareRequestSchema.safeParse({
        base: { kind: 'live', documentId: 'd' },
        target: { kind: 'live', documentId: 'd' },
        granularity: 'letter',
      }).success
    ).toBe(false);
    expect(COMPARE_MAX_PAGES).toBe(400);
    expect(ERROR_STATUS.COMPARE_TOO_LARGE).toBe(413);
    expect(ERROR_STATUS.ANCHOR_NOT_FOUND).toBe(404);
    expect(ERROR_STATUS.LIMIT_EXCEEDED).toBe(409);
  });
});

describe('B11 assets and R2', () => {
  it('declares the 17 routes with the spec auth and permissions', () => {
    const have = (n: keyof typeof API_ROUTES) =>
      `${API_ROUTES[n].method} ${API_ROUTES[n].path}`;
    expect(
      (
        [
          'assetUploadCreate',
          'assetUploadGet',
          'assetUploadParts',
          'assetUploadComplete',
          'assetUploadAbort',
          'assetsList',
          'assetGet',
          'assetUrl',
          'assetUpdate',
          'assetDelete',
          'assetRestore',
          'assetLinkCreate',
          'documentAssetLinks',
          'assetLinkUpdate',
          'assetLinkDelete',
          'documentStaleness',
          'assetLinkStaleness',
        ] as const
      ).map(have)
    ).toEqual([
      'POST /workspaces/:wid/assets/uploads',
      'GET /assets/uploads/:uploadId',
      'POST /assets/uploads/:uploadId/parts',
      'POST /assets/uploads/:uploadId/complete',
      'DELETE /assets/uploads/:uploadId',
      'GET /assets',
      'GET /assets/:aid',
      'GET /assets/:aid/versions/:vid/url',
      'PATCH /assets/:aid',
      'DELETE /assets/:aid',
      'POST /assets/:aid/restore',
      'POST /asset-links',
      'GET /documents/:did/asset-links',
      'PATCH /asset-links/:lid',
      'DELETE /asset-links/:lid',
      'GET /documents/:did/staleness',
      'GET /asset-links/:lid/staleness',
    ]);
    expect(API_ROUTES.assetUploadCreate).toMatchObject({
      auth: 'U,Krw',
      permission: 'assets.upload',
    });
    expect(API_ROUTES.assetsList).toMatchObject({
      auth: 'U,Kr',
      permission: 'assets.read',
    });
    expect(API_ROUTES.assetLinkCreate).toMatchObject({
      auth: 'U,Krw',
      permission: 'assets.link',
    });
  });
  it('error codes', () => {
    expect(ERROR_STATUS.ASSET_TYPE_REJECTED).toBe(415);
    expect(ERROR_STATUS.ASSET_CHECKSUM_MISMATCH).toBe(422);
    expect(ERROR_STATUS.ASSET_NOT_READY).toBe(409);
    expect(ERROR_STATUS.ASSET_IN_USE).toBe(409);
    expect(ERROR_STATUS.STORAGE_QUOTA_EXCEEDED).toBe(507);
    expect(ERROR_STATUS.ROLE_NOT_ALLOWED_FOR_TARGET).toBe(422);
    expect(ERROR_STATUS.ID_CONFLICT).toBe(409);
    expect(ERROR_STATUS.TARGET_NOT_FOUND).toBe(404);
  });
  it('vocabularies: kinds, roles, target kinds, role tables', () => {
    expect(ASSET_KINDS).toContain('image');
    expect(ASSET_ROLES).toContain('headshot');
    expect(ASSET_TARGET_KINDS).toEqual([
      'document',
      'scene',
      'element',
      'shot',
      'entity',
      'beat',
      'title_page',
      'snapshot',
    ]);
    expect(ASSET_ROLE_TARGETS.headshot).toEqual(['entity']);
    expect(ASSET_ROLE_ENTITY_KINDS.headshot).toEqual(['character']);
    expect(ASSET_MAX_BYTES.image).toBe(100 * 1024 ** 2);
    expect(ASSET_PART_SIZE_BYTES).toBe(8 * 1024 * 1024);
  });
  it('assetExtension and checkAssetFile mirror the server-side sniff decision (extension/kind/mime/size)', () => {
    expect(assetExtension('photo.PNG')).toBe('.png');
    expect(assetExtension('noext')).toBe('');
    expect(checkAssetFile('a.png', 'image/png', 100, 'image')).toBeNull();
    expect(checkAssetFile('a.png', 'image/png', 100, 'video')).toBe('kind');
    expect(checkAssetFile('a.png', 'video/mp4', 100, 'image')).toBe('mime');
    expect(checkAssetFile('a.xyz', 'image/png', 100, 'image')).toBe('type');
    expect(
      checkAssetFile('a.png', 'image/png', ASSET_MAX_BYTES.image + 1, 'image')
    ).toBe('size');
  });
  it('validates the upload and link request schemas', () => {
    expect(
      assetUploadRequestSchema.safeParse({
        filename: 'a.png',
        mimeType: 'image/png',
        sizeBytes: 5,
        kind: 'image',
      }).success
    ).toBe(true);
    expect(
      assetUploadRequestSchema.safeParse({
        filename: 'a.png',
        mimeType: 'image/png',
        sizeBytes: 0,
        kind: 'image',
      }).success
    ).toBe(false);
    expect(
      assetUploadRequestSchema.safeParse({
        filename: 'a.png',
        mimeType: 'image/png',
        sizeBytes: 5,
        kind: 'image',
        assetId: 'not-an-asset-id',
      }).success
    ).toBe(false);
    expect(
      assetUploadRequestSchema.safeParse({
        filename: 'a.png',
        mimeType: 'image/png',
        sizeBytes: 5,
        kind: 'image',
        assetId: 'asset_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      }).success
    ).toBe(true);
    expect(
      assetCompleteSchema.parse({ parts: [{ partNumber: 1, etag: 'e1' }] })
    ).toEqual({ parts: [{ partNumber: 1, etag: 'e1' }] });
    expect(
      assetCompleteSchema.safeParse({
        parts: [{ partNumber: 1, etag: 'e1' }],
        sha256Hex: 'zz',
      }).success
    ).toBe(false);
    expect(assetPartsRequestSchema.safeParse({ partNumbers: [] }).success).toBe(
      false
    );
    expect(
      assetPartsRequestSchema.safeParse({ partNumbers: [1, 2, 3] }).success
    ).toBe(true);
    expect(assetUpdateSchema.safeParse({}).success).toBe(false); // nothing to update
    expect(assetUpdateSchema.safeParse({ title: 'New title' }).success).toBe(
      true
    );
    expect(assetRightsSchema.parse({}).aiTrainingAllowed).toBe(false);
    const link = assetLinkCreateSchema.parse({
      assetId: 'asset_1',
      target: { kind: 'scene', id: 'el_1' },
      role: 'set_concept',
    });
    expect(link).toMatchObject({
      assetId: 'asset_1',
      target: { kind: 'scene', id: 'el_1' },
      role: 'set_concept',
    });
    expect(assetLinkUpdateSchema.safeParse({}).success).toBe(false);
    expect(
      assetLinkUpdateSchema.safeParse({ pinnedVersionId: null }).success
    ).toBe(true);
    expect(assetListQuerySchema.parse({ workspaceId: 'ws_1' })).toMatchObject({
      workspaceId: 'ws_1',
      limit: 50,
    });
    expect(assetListQuerySchema.safeParse({ linkedTo: 'nope' }).success).toBe(
      false
    );
    expect(
      assetListQuerySchema.safeParse({ linkedTo: 'entity:ent_1' }).success
    ).toBe(true);
  });
});

describe('B12 collaboration, notifications, devices, email', () => {
  it('registers the 19 routes with the spec auth and permissions', () => {
    const have = (n: keyof typeof API_ROUTES) =>
      `${API_ROUTES[n].method} ${API_ROUTES[n].path}`;
    expect(
      (
        [
          'meNotificationPrefsGet',
          'meNotificationPrefsSet',
          'documentMentionsWithoutAccess',
          'documentChatList',
          'documentChatCreate',
          'chatMessageUpdate',
          'chatMessageDelete',
          'documentActivity',
          'workspaceActivity',
          'notificationsList',
          'notificationsRead',
          'notificationDelete',
          'notificationsStream',
          'devicesList',
          'deviceCreate',
          'deviceUpdate',
          'deviceRevoke',
          'devicePushTokenSet',
          'devicePushTokenDelete',
        ] as const
      ).map(have)
    ).toEqual([
      'GET /me/notification-prefs',
      'PUT /me/notification-prefs',
      'GET /documents/:did/mentions-without-access',
      'GET /documents/:did/chat',
      'POST /documents/:did/chat',
      'PATCH /chat-messages/:mid',
      'DELETE /chat-messages/:mid',
      'GET /documents/:did/activity',
      'GET /workspaces/:wid/activity',
      'GET /notifications',
      'POST /notifications/read',
      'DELETE /notifications/:nid',
      'GET /notifications/stream',
      'GET /devices',
      'POST /devices',
      'PATCH /devices/:devid',
      'POST /devices/:devid/revoke',
      'PUT /devices/:devid/push-token',
      'DELETE /devices/:devid/push-token',
    ]);
    expect(API_ROUTES.documentChatList.auth).toBe('U,Kr,L');
    expect(API_ROUTES.documentChatCreate.auth).toBe('U,L');
    expect(API_ROUTES.documentActivity.auth).toBe('U,Kr');
    expect(API_ROUTES.workspaceActivity).toMatchObject({
      auth: 'U',
      permission: 'workspace.read',
    });
    expect(API_ROUTES.documentMentionsWithoutAccess).toMatchObject({
      auth: 'U',
      permission: 'share.manage',
    });
    for (const n of [
      'notificationsList',
      'devicesList',
      'deviceCreate',
    ] as const)
      expect(API_ROUTES[n].auth).toBe('U');
    expect(ERROR_STATUS.EDIT_WINDOW_CLOSED).toBe(409);
    expect(ERROR_STATUS.DEVICE_REVOKED).toBe(403);
    expect(ERROR_STATUS.RATE_LIMITED).toBe(429);
  });

  it('notification prefs: defaults and merge', () => {
    expect(NOTIFICATION_KINDS).toContain('mention');
    expect(NOTIFICATION_KINDS).toContain('writing_reminder');
    expect(defaultNotificationKindPrefs('mention')).toEqual({
      inApp: true,
      push: true,
      email: 'immediate',
    });
    expect(defaultNotificationKindPrefs('writing_reminder')).toMatchObject({
      push: false,
      email: 'off',
    });
    const base = defaultNotificationPrefs();
    expect(base.writingReminderTime).toBeNull();
    expect(Object.keys(base.kinds)).toHaveLength(NOTIFICATION_KINDS.length);
    const merged = mergeNotificationPrefs(base, {
      kinds: { mention: { email: 'off' } },
      writingReminderTime: '09:30',
    });
    expect(merged.kinds.mention).toEqual({
      inApp: true,
      push: true,
      email: 'off',
    });
    expect(merged.kinds.note_reply).toEqual(base.kinds.note_reply); // untouched kinds are unchanged
    expect(merged.writingReminderTime).toBe('09:30');
    expect(
      notificationPrefsSchema.safeParse({ writingReminderTime: '9:30' }).success
    ).toBe(false);
    expect(
      notificationPrefsSchema.safeParse({ writingReminderTime: '09:30' })
        .success
    ).toBe(true);
    expect(
      notificationPrefsSchema.safeParse({ writingReminderTime: null }).success
    ).toBe(true);
    expect(
      notificationPrefsSchema.safeParse({
        kinds: { nonsense_kind: { push: true } },
      }).success
    ).toBe(false);
    expect(notificationsReadSchema.safeParse({}).success).toBe(false);
    expect(notificationsReadSchema.safeParse({ all: true }).success).toBe(true);
    expect(notificationsQuerySchema.parse({ unread: 'true' })).toMatchObject({
      unread: true,
      limit: 50,
    });
  });

  it('chat: body length, mentions, edit window', () => {
    expect(CHAT_BODY_MAX).toBe(4000);
    expect(
      chatMessageCreateSchema.safeParse({
        clientMessageId: 'msg_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        body: 'hi',
      }).success
    ).toBe(true);
    expect(
      chatMessageCreateSchema.safeParse({
        clientMessageId: 'msg_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        body: '   ',
      }).success
    ).toBe(false);
    expect(
      chatMessageCreateSchema.safeParse({
        clientMessageId: 'not-an-id',
        body: 'hi',
      }).success
    ).toBe(false);
    expect(
      chatMessageCreateSchema.safeParse({
        clientMessageId: 'msg_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        body: 'x'.repeat(4001),
      }).success
    ).toBe(false);
    const withMentions = chatMessageCreateSchema.parse({
      clientMessageId: 'msg_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      body: 'check #12A @sam',
      mentions: [{ userId: 'sam' }],
    });
    expect(withMentions.mentions).toEqual([{ userId: 'sam' }]);
    expect(
      mentionRefSchema.safeParse({ userId: 'sam', offset: 5, length: 4 })
        .success
    ).toBe(true);
    expect(chatMessageUpdateSchema.safeParse({ body: '' }).success).toBe(false);
  });

  it('activity: vocabularies and query schemas', () => {
    expect(ACTIVITY_KINDS).toContain('document.created');
    expect(ACTIVITY_KINDS).toContain('session.edited');
    expect(
      activityQuerySchema.parse({
        kinds: ['document.created', 'snapshot.created'],
      }).kinds
    ).toHaveLength(2);
    expect(
      workspaceActivityQuerySchema.parse({ projectId: 'prj_1' })
    ).toMatchObject({ projectId: 'prj_1', limit: 50 });
  });

  it('devices: create/update/push-token schemas', () => {
    expect(DEVICE_PLATFORMS).toEqual([
      'web',
      'ios',
      'ipados',
      'android',
      'macos',
      'windows',
    ]);
    expect(PUSH_PLATFORMS).toEqual(['apns', 'fcm', 'wns', 'webpush']);
    expect(
      deviceCreateSchema.safeParse({
        id: 'dev_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        installId: 'i1',
        displayName: 'My Mac',
        platform: 'macos',
        appVersion: '1.0.0',
      }).success
    ).toBe(true);
    expect(
      deviceCreateSchema.safeParse({
        id: 'not-a-device-id',
        installId: 'i1',
        displayName: 'My Mac',
        platform: 'macos',
        appVersion: '1.0.0',
      }).success
    ).toBe(false);
    expect(
      deviceCreateSchema.safeParse({
        id: 'dev_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        installId: 'i1',
        displayName: 'My Mac',
        platform: 'nope',
        appVersion: '1.0.0',
      }).success
    ).toBe(false);
    expect(deviceUpdateSchema.safeParse({ displayName: '' }).success).toBe(
      false
    );
    expect(
      pushTokenSetSchema.safeParse({
        platform: 'apns',
        token: 't',
        environment: 'sandbox',
      }).success
    ).toBe(true);
    expect(
      pushTokenSetSchema.safeParse({ platform: 'nope', token: 't' }).success
    ).toBe(false);
  });
});

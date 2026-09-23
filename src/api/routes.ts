/**
 * Route table for slices B1-B5 (spec 05 §6). Paths are relative to API_BASE_PATH.
 * `auth` uses the spec legend: U user, K key (r/rw scope), L link, P public.
 * `permission` is the spec 05 §5.2 permission checked on the resolved object.
 */
export const API_BASE_PATH = '/api/v1';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RouteSpec {
  method: HttpMethod;
  path: string;
  auth: string;
  permission: string | null;
}

const r = (
  method: HttpMethod,
  path: string,
  auth: string,
  permission: string | null = null
): RouteSpec => ({ method, path, auth, permission });

export const API_ROUTES = {
  // B1
  health: r('GET', '/health', 'P'),
  meGet: r('GET', '/me', 'U,Kr'),
  mePatch: r('PATCH', '/me', 'U'),
  // B2 workspaces
  workspacesList: r('GET', '/workspaces', 'U,Kr'),
  workspaceGet: r('GET', '/workspaces/:wid', 'U,Kr', 'workspace.read'),
  // B2 projects
  projectsList: r('GET', '/workspaces/:wid/projects', 'U,Kr', 'project.read'),
  projectCreate: r(
    'POST',
    '/workspaces/:wid/projects',
    'U,Krw',
    'project.create'
  ),
  projectGet: r('GET', '/projects/:pid', 'U,Kr,L', 'project.read'),
  projectUpdate: r('PATCH', '/projects/:pid', 'U,Krw', 'project.update'),
  projectTrash: r('POST', '/projects/:pid/trash', 'U,Krw', 'project.trash'),
  projectRestore: r(
    'POST',
    '/projects/:pid/restore',
    'U,Krw',
    'project.restore'
  ),
  // B2 documents
  documentsList: r(
    'GET',
    '/projects/:pid/documents',
    'U,Kr,L',
    'document.read'
  ),
  documentCreate: r(
    'POST',
    '/projects/:pid/documents',
    'U,Krw',
    'document.create'
  ),
  documentGet: r('GET', '/documents/:did', 'U,Kr,L', 'document.read'),
  documentUpdate: r('PATCH', '/documents/:did', 'U,Krw', 'document.edit'),
  documentTrash: r('POST', '/documents/:did/trash', 'U,Krw', 'document.trash'),
  documentRestore: r(
    'POST',
    '/documents/:did/restore',
    'U,Krw',
    'document.restore'
  ),
  documentState: r('GET', '/documents/:did/state', 'U,Kr,L', 'document.read'),
  documentContent: r(
    'GET',
    '/documents/:did/content',
    'U,Kr,L',
    'document.read'
  ),
  // B2 templates
  templatesList: r('GET', '/templates', 'U,Kr'),
  templateGet: r('GET', '/templates/:tid', 'U,Kr'),
  // B3 sync (WebSocket upgrade, credentials travel in the first `auth` frame)
  sync: r('GET', '/sync', 'P'),
  // B4 versions and snapshots
  versionsList: r('GET', '/documents/:did/versions', 'U,Kr,L', 'document.read'),
  versionState: r(
    'GET',
    '/documents/:did/versions/:vid/state',
    'U,Kr,L',
    'document.read'
  ),
  versionRestore: r(
    'POST',
    '/documents/:did/versions/:vid/restore',
    'U,Krw',
    'document.restore'
  ),
  versionSnapshot: r(
    'POST',
    '/documents/:did/versions/:vid/snapshot',
    'U,Krw',
    'snapshot.create'
  ),
  snapshotsList: r(
    'GET',
    '/documents/:did/snapshots',
    'U,Kr,L',
    'snapshot.read'
  ),
  snapshotCreate: r(
    'POST',
    '/documents/:did/snapshots',
    'U,Krw',
    'snapshot.create'
  ),
  snapshotGet: r('GET', '/snapshots/:sid', 'U,Kr,L', 'snapshot.read'),
  snapshotState: r('GET', '/snapshots/:sid/state', 'U,Kr,L', 'snapshot.read'),
  snapshotContent: r(
    'GET',
    '/snapshots/:sid/content',
    'U,Kr,L',
    'snapshot.read'
  ),
  snapshotOpen: r('POST', '/snapshots/:sid/open', 'U,Krw', 'snapshot.open'),
  snapshotFork: r('POST', '/snapshots/:sid/fork', 'U,Krw', 'snapshot.read'),
  // B15 versions, snapshots and sync completion (spec 05 §6.7.1, §6.9-6.11)
  elementHistory: r(
    'GET',
    '/documents/:did/elements/:elementId/history',
    'U,Kr',
    'document.read'
  ),
  documentPresence: r(
    'GET',
    '/documents/:did/presence',
    'U,Kr',
    'document.read'
  ),
  versionRestoreAsCopy: r(
    'POST',
    '/documents/:did/versions/:vid/restore-as-copy',
    'U,Krw',
    'version.restoreAsCopy'
  ),
  snapshotPrefs: r('PUT', '/snapshots/:sid/prefs', 'U', 'snapshot.hideForSelf'),
  snapshotNotesList: r(
    'GET',
    '/snapshots/:sid/notes',
    'U,Kr,L',
    'snapshot.read'
  ),
  snapshotNoteCreate: r(
    'POST',
    '/snapshots/:sid/notes',
    'U,Krw',
    'snapshot.appendNote'
  ),
  snapshotCommentsList: r(
    'GET',
    '/snapshots/:sid/comments',
    'U,Kr,L',
    'snapshot.read'
  ),
  snapshotCommentCreate: r(
    'POST',
    '/snapshots/:sid/comments',
    'U,L',
    'document.comment'
  ),
  snapshotCommentCopyToLive: r(
    'POST',
    '/snapshot-comments/:cid/copy-to-live',
    'U',
    'document.edit'
  ),
  snapshotCommentResolve: r(
    'POST',
    '/snapshot-comments/:cid/resolve',
    'U',
    'document.comment'
  ),
  documentCompare: r(
    'POST',
    '/documents/:did/compare',
    'U,Kr,L',
    'snapshot.read'
  ),
  // Import and export (synchronous, no jobs)
  documentImport: r(
    'POST',
    '/projects/:pid/documents/import',
    'U,Krw',
    'document.create'
  ),
  documentExport: r('POST', '/documents/:did/export', 'U,Kr', 'document.read'),
  formatsList: r('GET', '/formats', 'U,Kr'),
  // B5 commands and reads
  commands: r('POST', '/documents/:did/commands', 'U,Krw', 'document.edit'),
  outline: r('GET', '/documents/:did/outline', 'U,Kr,L', 'document.read'),
  scene: r('GET', '/documents/:did/scenes/:sceneId', 'U,Kr,L', 'document.read'),
  scenesBatch: r(
    'POST',
    '/documents/:did/scenes/batch',
    'U,Kr,L',
    'document.read'
  ),
  elementsBatch: r(
    'POST',
    '/documents/:did/elements/batch',
    'U,Kr,L',
    'document.read'
  ),
  // B6 personal API keys (user principals only; a key gets 403 API_KEY_FORBIDDEN)
  apiKeysList: r('GET', '/api-keys', 'U'),
  apiKeyCreate: r('POST', '/api-keys', 'U', 'apiKeys.use'),
  apiKeyUpdate: r('PATCH', '/api-keys/:kid', 'U'),
  apiKeyRevoke: r('DELETE', '/api-keys/:kid', 'U'),
  // B7 AI: script review and polish. Keys need the `ai` flag (403 AI_KEY_NOT_PERMITTED) and, to start
  // jobs or decide suggestions, read_write scope.
  aiStatus: r('GET', '/ai/status', 'U,Kr'),
  aiJobCreate: r('POST', '/documents/:did/ai/jobs', 'U,Krw', 'ai.run'),
  aiJobsList: r('GET', '/documents/:did/ai/jobs', 'U,Kr', 'document.read'),
  aiJobGet: r('GET', '/ai/jobs/:jobId', 'U,Kr', 'document.read'),
  aiJobCancel: r('POST', '/ai/jobs/:jobId/cancel', 'U,Krw', 'ai.review'),
  aiSuggestionSetsList: r(
    'GET',
    '/documents/:did/ai/suggestion-sets',
    'U,Kr',
    'document.read'
  ),
  aiSuggestionSetGet: r(
    'GET',
    '/ai/suggestion-sets/:ssid',
    'U,Kr',
    'document.read'
  ),
  aiSuggestionSetAccept: r(
    'POST',
    '/ai/suggestion-sets/:ssid/accept',
    'U,Krw',
    'document.edit'
  ),
  aiSuggestionSetReject: r(
    'POST',
    '/ai/suggestion-sets/:ssid/reject',
    'U,Krw',
    'document.edit'
  ),
  // B8 tenancy, roles, sharing. Keys (K) only read members and /me/shared; everything else is user-only (403 API_KEY_FORBIDDEN).
  workspaceCreate: r('POST', '/workspaces', 'U'),
  workspaceUpdate: r('PATCH', '/workspaces/:wid', 'U', 'workspace.update'),
  workspaceDelete: r('DELETE', '/workspaces/:wid', 'U', 'workspace.delete'),
  workspaceTransfer: r(
    'POST',
    '/workspaces/:wid/transfer',
    'U',
    'workspace.transfer'
  ),
  workspaceLeave: r('POST', '/workspaces/:wid/leave', 'U', 'workspace.leave'),
  workspaceUsage: r('GET', '/workspaces/:wid/usage', 'U', 'workspace.read'),
  workspaceAudit: r(
    'GET',
    '/workspaces/:wid/audit.csv',
    'U',
    'workspace.audit'
  ),
  membersList: r('GET', '/workspaces/:wid/members', 'U,Kr', 'members.read'),
  memberUpdate: r(
    'PATCH',
    '/workspaces/:wid/members/:uid',
    'U',
    'members.updateRole'
  ),
  memberRemove: r(
    'DELETE',
    '/workspaces/:wid/members/:uid',
    'U',
    'members.remove'
  ),
  invitationCreateWorkspace: r(
    'POST',
    '/workspaces/:wid/invitations',
    'U',
    'members.invite'
  ),
  invitationCreateProject: r(
    'POST',
    '/projects/:pid/invitations',
    'U',
    'share.manage'
  ),
  invitationCreateDocument: r(
    'POST',
    '/documents/:did/invitations',
    'U',
    'share.manage'
  ),
  workspaceInvitationsList: r(
    'GET',
    '/workspaces/:wid/invitations',
    'U',
    'members.invite'
  ),
  myInvitations: r('GET', '/me/invitations', 'U'),
  invitationRenew: r('POST', '/invitations/:iid/renew', 'U'),
  invitationCancel: r('DELETE', '/invitations/:iid', 'U'),
  invitationAccept: r('POST', '/invitations/accept', 'U'),
  invitationDecline: r('POST', '/invitations/:iid/decline', 'U'),
  sharedWithMe: r('GET', '/me/shared', 'U,Kr'),
  documentLock: r('POST', '/documents/:did/lock', 'U', 'document.lock'),
  documentUnlock: r('DELETE', '/documents/:did/lock', 'U', 'document.lock'),
  documentUnlockSession: r(
    'POST',
    '/documents/:did/unlock-session',
    'U',
    'document.read'
  ),
  shareLinkCreateDocument: r(
    'POST',
    '/documents/:did/share-links',
    'U',
    'share.manage'
  ),
  shareLinkCreateProject: r(
    'POST',
    '/projects/:pid/share-links',
    'U',
    'share.manage'
  ),
  shareLinkCreateSnapshot: r(
    'POST',
    '/snapshots/:sid/share-links',
    'U',
    'share.manage'
  ),
  shareLinksListDocument: r(
    'GET',
    '/documents/:did/share-links',
    'U',
    'share.manage'
  ),
  shareLinksListProject: r(
    'GET',
    '/projects/:pid/share-links',
    'U',
    'share.manage'
  ),
  shareLinkUpdate: r('PATCH', '/share-links/:lid', 'U', 'share.manage'),
  shareLinkRevoke: r('DELETE', '/share-links/:lid', 'U', 'share.manage'),
  grantsListDocument: r('GET', '/documents/:did/grants', 'U', 'share.manage'),
  grantsListProject: r('GET', '/projects/:pid/grants', 'U', 'share.manage'),
  grantUpdate: r('PATCH', '/grants/:gid', 'U', 'share.manage'),
  grantRemove: r('DELETE', '/grants/:gid', 'U', 'share.manage'),
  // B8 public link routes: the token in the path is the credential; an optional Bearer is a user or a link session (`fls_`).
  publicShareResolve: r('GET', '/public/share/:token', 'P'),
  shareUnlock: r('POST', '/share/:token/unlock', 'P'),
  shareState: r('GET', '/share/:token/state', 'P,L', 'document.read'),
  // B9 generic jobs (spec 05 §6.19). Jobs are visible to their owner, or to anyone who can read the job's document;
  // cancel, outputs and recipients are owner-only. `/ai/jobs*` stays as the AI facade over the same rows.
  jobsList: r('GET', '/jobs', 'U,Kr', 'document.read'),
  jobGet: r('GET', '/jobs/:jobId', 'U,Kr,L', 'document.read'),
  jobCreate: r('POST', '/jobs', 'U,Krw', 'document.read'),
  jobCancel: r('POST', '/jobs/:jobId/cancel', 'U,Krw', 'document.read'),
  jobOutputs: r('GET', '/jobs/:jobId/outputs', 'U,K,L', 'document.export'),
  jobRecipients: r('GET', '/jobs/:jobId/recipients', 'U', 'document.export'),
  // Provider webhook: unauthenticated, HMAC-signed with JOB_WEBHOOK_SECRET_<ADAPTER> (fails closed: 401 when unset).
  jobWebhook: r('POST', '/webhooks/jobs/:adapterId', 'W'),
  // B10 projection-backed reads, search, reports, packets (spec 05 §6.7.1, §6.7.2, §6.12, §6.14, §6.15, §6.17, §6.18, §6.22).
  // `?source=live|snapshot:<id>|version:<id>` selects the state a read answers from. Keys (K) read all of these; the report
  // and resolve POSTs are reads, so a read-only key may send them.
  entitiesList: r('GET', '/documents/:did/entities', 'U,Kr,L', 'document.read'),
  entityGet: r(
    'GET',
    '/documents/:did/entities/:eid',
    'U,Kr,L',
    'document.read'
  ),
  entityUsage: r(
    'GET',
    '/documents/:did/entities/:eid/usage',
    'U,Kr,L',
    'document.read'
  ),
  entityDialogue: r(
    'GET',
    '/documents/:did/entities/:eid/dialogue',
    'U,Kr,L',
    'document.read'
  ),
  tagCategoriesList: r(
    'GET',
    '/documents/:did/tag-categories',
    'U,Kr,L',
    'document.read'
  ),
  tagsList: r('GET', '/documents/:did/tags', 'U,Kr,L', 'document.read'),
  notesList: r('GET', '/documents/:did/notes', 'U,Kr,L', 'document.read'),
  beatsList: r('GET', '/documents/:did/beats', 'U,Kr,L', 'document.read'),
  binList: r('GET', '/documents/:did/bin', 'U,Kr,L', 'document.read'),
  revisionsGet: r(
    'GET',
    '/documents/:did/revisions',
    'U,Kr,L',
    'document.read'
  ),
  changesList: r('GET', '/documents/:did/changes', 'U,Kr,L', 'document.read'),
  alternatesGet: r(
    'GET',
    '/documents/:did/alternates/:elementId',
    'U,Kr,L',
    'document.read'
  ),
  titlePageGet: r(
    'GET',
    '/documents/:did/title-page',
    'U,Kr,L',
    'document.read'
  ),
  statsGet: r('GET', '/documents/:did/stats', 'U,Kr,L', 'document.read'),
  fountainGet: r('GET', '/documents/:did/fountain', 'U,Kr,L', 'document.read'),
  sceneShotsList: r(
    'GET',
    '/documents/:did/scenes/:sceneId/shots',
    'U,Kr,L',
    'document.read'
  ),
  resolveBatch: r('POST', '/documents/:did/resolve', 'U,Kr,L', 'document.read'),
  resolveOne: r('GET', '/documents/:did/resolve', 'U,Kr,L', 'document.read'),
  documentSearch: r('GET', '/documents/:did/search', 'U,Kr,L', 'document.read'),
  workspaceSearch: r(
    'GET',
    '/workspaces/:wid/search',
    'U,Kr',
    'workspace.read'
  ),
  search: r('GET', '/search', 'U,Kr'),
  reportKinds: r('GET', '/reports/kinds', 'U,Kr'),
  reportGet: r('GET', '/documents/:did/reports/:kind', 'U,Kr,L', 'reports.run'),
  reportCreate: r('POST', '/documents/:did/reports', 'U,Kr,L', 'reports.run'),
  packetScene: r(
    'GET',
    '/documents/:did/packets/scene/:locator',
    'U,Kr',
    'document.read'
  ),
  packetCharacter: r(
    'GET',
    '/documents/:did/packets/character/:locator',
    'U,Kr',
    'document.read'
  ),
  packetLocation: r(
    'GET',
    '/documents/:did/packets/location/:locator',
    'U,Kr',
    'document.read'
  ),
  packetShot: r(
    'GET',
    '/documents/:did/packets/shot/:locator',
    'U,Kr',
    'document.read'
  ),
  // B13 account and per-user data (spec 05 §6.1, §6.1.1, §6.26). User-only (a key gets 403 API_KEY_FORBIDDEN) except the macro list (Kr).
  meDictionaryGet: r('GET', '/me/dictionary', 'U'),
  meDictionaryUpdate: r('PUT', '/me/dictionary', 'U'),
  mePreferencesGet: r('GET', '/me/preferences', 'U'),
  mePreferencesSet: r('PUT', '/me/preferences', 'U'),
  meMacrosList: r('GET', '/me/macros', 'U,Kr'),
  meMacroCreate: r('POST', '/me/macros', 'U'),
  meMacroUpdate: r('PATCH', '/me/macros/:mid', 'U'),
  meMacroDelete: r('DELETE', '/me/macros/:mid', 'U'),
  meWritingStats: r('GET', '/me/writing-stats', 'U'),
  meWritingSessionCreate: r('POST', '/me/writing-sessions', 'U'),
  meWritingGoalsGet: r('GET', '/me/writing-goals', 'U'),
  meWritingGoalsSet: r('PUT', '/me/writing-goals', 'U'),
  meExport: r('POST', '/me/export', 'U'),
  meDelete: r('DELETE', '/me', 'U'),
  meRestore: r('POST', '/me/restore', 'U'),
  documentMyStateGet: r(
    'GET',
    '/documents/:did/my-state',
    'U',
    'document.read'
  ),
  documentMyStateSet: r(
    'PUT',
    '/documents/:did/my-state',
    'U',
    'document.read'
  ),
  documentStar: r('PUT', '/documents/:did/star', 'U', 'document.read'),
  documentUnstar: r('DELETE', '/documents/:did/star', 'U', 'document.read'),
  // B14 project, document and template lifecycle, workspace settings (spec 05 §6.2, §6.6-§6.8, §6.26). Writes are `Krw`; purge,
  // trash-empty, workspace defaults and contacts are user-only (a key gets 403 API_KEY_FORBIDDEN).
  workspaceDocuments: r(
    'GET',
    '/workspaces/:wid/documents',
    'U,Kr',
    'project.read'
  ),
  workspaceTrash: r('GET', '/workspaces/:wid/trash', 'U,Kr', 'project.read'),
  workspaceTrashEmpty: r(
    'POST',
    '/workspaces/:wid/trash/empty',
    'U',
    'project.purge'
  ),
  projectPurge: r('DELETE', '/projects/:pid', 'U', 'project.purge'),
  projectDuplicate: r(
    'POST',
    '/projects/:pid/duplicate',
    'U,Krw',
    'project.create'
  ),
  projectFolderCreate: r(
    'POST',
    '/projects/:pid/folders',
    'U,Krw',
    'project.update'
  ),
  projectFolderUpdate: r(
    'PATCH',
    '/project-folders/:fid',
    'U,Krw',
    'project.update'
  ),
  projectFolderDelete: r(
    'DELETE',
    '/project-folders/:fid',
    'U,Krw',
    'project.update'
  ),
  documentMove: r('POST', '/documents/:did/move', 'U,Krw', 'document.move'),
  documentPurge: r('DELETE', '/documents/:did', 'U', 'project.purge'),
  documentDuplicate: r(
    'POST',
    '/documents/:did/duplicate',
    'U,Krw',
    'document.create'
  ),
  documentApplyTemplate: r(
    'POST',
    '/documents/:did/template',
    'U,Krw',
    'document.lock'
  ),
  templateCreate: r('POST', '/templates', 'U,Krw', 'templates.manage'),
  templateVersionCreate: r(
    'POST',
    '/templates/:tid/versions',
    'U,Krw',
    'templates.manage'
  ),
  templateUpdate: r('PATCH', '/templates/:tid', 'U,Krw', 'templates.manage'),
  templateDelete: r('DELETE', '/templates/:tid', 'U,Krw', 'templates.manage'),
  templateImport: r('POST', '/templates/import', 'U,Krw', 'templates.manage'),
  templateExport: r('GET', '/templates/:tid/export', 'U,Kr'),
  projectBinList: r('GET', '/projects/:pid/bin', 'U,Kr', 'project.read'),
  projectBinCreate: r('POST', '/projects/:pid/bin', 'U,Krw', 'document.edit'),
  projectBinDelete: r(
    'DELETE',
    '/project-bin-items/:id',
    'U,Krw',
    'document.edit'
  ),
  workspaceDefaultsGet: r(
    'GET',
    '/workspaces/:wid/defaults',
    'U,Kr',
    'workspace.read'
  ),
  workspaceDefaultsSet: r(
    'PUT',
    '/workspaces/:wid/defaults',
    'U',
    'workspace.update'
  ),
  workspaceContactsList: r(
    'GET',
    '/workspaces/:wid/contacts',
    'U',
    'workspace.read'
  ),
  workspaceContactsCreate: r(
    'POST',
    '/workspaces/:wid/contacts',
    'U',
    'workspace.update'
  ),
  workspaceContactUpdate: r(
    'PATCH',
    '/workspace-contacts/:cid',
    'U',
    'workspace.update'
  ),
  workspaceContactDelete: r(
    'DELETE',
    '/workspace-contacts/:cid',
    'U',
    'workspace.update'
  ),
  // B16 imports, exports and watermark as jobs (spec 05 §6.18). `POST /imports*` and `/uploads/state` are `Krw`; exports are `Kr` (a read key may
  // export what it can read); the watermark lookup is user-only (403 API_KEY_FORBIDDEN for a key). The synchronous
  // `documentImport`/`documentExport`/`formatsList` stay until the app moves to these (see the plan's B16 "Deferred" list).
  uploadState: r('POST', '/uploads/state', 'U,Krw'),
  importCreate: r('POST', '/imports', 'U,Krw', 'document.create'),
  importStart: r('POST', '/imports/:importId/start', 'U,Krw'),
  documentImportOver: r(
    'POST',
    '/documents/:did/import-over',
    'U,Krw',
    'document.edit'
  ),
  documentExportCreate: r(
    'POST',
    '/documents/:did/exports',
    'U,Kr',
    'document.export'
  ),
  documentExportCombined: r(
    'POST',
    '/documents/export-combined',
    'U,Kr',
    'document.export'
  ),
  watermarkLookup: r(
    'POST',
    '/workspaces/:wid/watermark-lookup',
    'U',
    'workspace.audit'
  ),
  // B11 assets and R2 (spec 05 §6.13). Bytes go to object storage through presigned URLs, never through the API. Writes are `Krw`, reads `Kr`;
  // share-link readers (`L`) are not built (no `/share/:token/assets` route yet). The uploader routes check the caller is the uploader.
  assetUploadCreate: r(
    'POST',
    '/workspaces/:wid/assets/uploads',
    'U,Krw',
    'assets.upload'
  ),
  assetUploadGet: r('GET', '/assets/uploads/:uploadId', 'U,Krw'),
  assetUploadParts: r('POST', '/assets/uploads/:uploadId/parts', 'U,Krw'),
  assetUploadComplete: r('POST', '/assets/uploads/:uploadId/complete', 'U,Krw'),
  assetUploadAbort: r('DELETE', '/assets/uploads/:uploadId', 'U,Krw'),
  assetsList: r('GET', '/assets', 'U,Kr', 'assets.read'),
  assetGet: r('GET', '/assets/:aid', 'U,Kr', 'assets.read'),
  assetUrl: r('GET', '/assets/:aid/versions/:vid/url', 'U,Kr', 'assets.read'),
  assetUpdate: r('PATCH', '/assets/:aid', 'U,Krw', 'assets.upload'),
  assetDelete: r('DELETE', '/assets/:aid', 'U,Krw', 'assets.upload'),
  assetRestore: r('POST', '/assets/:aid/restore', 'U,Krw', 'assets.upload'),
  assetLinkCreate: r('POST', '/asset-links', 'U,Krw', 'assets.link'),
  documentAssetLinks: r(
    'GET',
    '/documents/:did/asset-links',
    'U,Kr',
    'assets.read'
  ),
  assetLinkUpdate: r('PATCH', '/asset-links/:lid', 'U,Krw', 'assets.link'),
  assetLinkDelete: r('DELETE', '/asset-links/:lid', 'U,Krw', 'assets.link'),
  documentStaleness: r(
    'GET',
    '/documents/:did/staleness',
    'U,Kr',
    'document.read'
  ),
  assetLinkStaleness: r(
    'GET',
    '/asset-links/:lid/staleness',
    'U,Kr',
    'assets.read'
  ),
  // B12 collaboration, notifications, devices, email (spec 05 §6.15, §6.16, §6.24, §6.26). Most of this slice is
  // user-only (a key gets 403 API_KEY_FORBIDDEN): personal notifications and devices, and chat/activity writes are
  // never for a key. `documentChatList` and `documentActivity` are the two exceptions (`Kr`, a read key may read them).
  meNotificationPrefsGet: r('GET', '/me/notification-prefs', 'U'),
  meNotificationPrefsSet: r('PUT', '/me/notification-prefs', 'U'),
  documentMentionsWithoutAccess: r(
    'GET',
    '/documents/:did/mentions-without-access',
    'U',
    'share.manage'
  ),
  documentChatList: r('GET', '/documents/:did/chat', 'U,Kr,L', 'document.chat'),
  documentChatCreate: r('POST', '/documents/:did/chat', 'U,L', 'document.chat'),
  chatMessageUpdate: r('PATCH', '/chat-messages/:mid', 'U', 'document.chat'),
  chatMessageDelete: r('DELETE', '/chat-messages/:mid', 'U', 'document.chat'),
  documentActivity: r(
    'GET',
    '/documents/:did/activity',
    'U,Kr',
    'document.activity'
  ),
  workspaceActivity: r(
    'GET',
    '/workspaces/:wid/activity',
    'U',
    'workspace.read'
  ),
  notificationsList: r('GET', '/notifications', 'U'),
  notificationsRead: r('POST', '/notifications/read', 'U'),
  notificationDelete: r('DELETE', '/notifications/:nid', 'U'),
  notificationsStream: r('GET', '/notifications/stream', 'U'),
  devicesList: r('GET', '/devices', 'U'),
  deviceCreate: r('POST', '/devices', 'U'),
  deviceUpdate: r('PATCH', '/devices/:devid', 'U'),
  deviceRevoke: r('POST', '/devices/:devid/revoke', 'U'),
  devicePushTokenSet: r('PUT', '/devices/:devid/push-token', 'U'),
  devicePushTokenDelete: r('DELETE', '/devices/:devid/push-token', 'U'),
  // B17 AI completion and credits (spec 05 §6.3, §6.19, §6.20, §6.21; spec 06 §9-10). AI routes need the key's `ai`
  // flag (403 AI_KEY_NOT_PERMITTED); `decide` needs read_write. Consent, activity and credits are user-only except
  // the balance/products reads (Kr; a key spends its own workspace's credits so it may read them) — `consumables/products`
  // is also public (unauthenticated pricing display). `GET .../suggestion-sets` and `GET /suggestion-sets/:ssid` are
  // already built (B7, under `/ai/` — kept as-is rather than duplicated at the bare path spec 05 Appendix A also lists).
  meAiConsentGet: r('GET', '/me/ai-consents', 'U'),
  meAiConsentAccept: r('POST', '/me/ai-consents', 'U'),
  meAiActivity: r('GET', '/me/ai-activity', 'U'),
  workspaceAiActivity: r(
    'GET',
    '/workspaces/:wid/ai-activity',
    'U',
    'workspace.audit'
  ),
  aiEstimate: r('POST', '/documents/:did/ai/estimate', 'U,Kr', 'document.read'),
  aiReportsList: r(
    'GET',
    '/documents/:did/ai/reports',
    'U,Kr',
    'document.read'
  ),
  aiReportGet: r(
    'GET',
    '/documents/:did/ai/reports/:jobId',
    'U,Kr',
    'document.read'
  ),
  aiReportNoteConvert: r(
    'POST',
    '/documents/:did/ai/reports/:jobId/notes/:noteId/convert',
    'U,Krw',
    'document.comment'
  ),
  aiSuggestionSetDecide: r(
    'POST',
    '/ai/suggestion-sets/:ssid/decide',
    'U,Krw',
    'document.edit'
  ),
  consumablesBalance: r('GET', '/consumables/balance', 'U,Kr'),
  consumablesPurchases: r('GET', '/consumables/purchases', 'U'),
  consumablesUsages: r('GET', '/consumables/usages', 'U'),
  consumablesProducts: r('GET', '/consumables/products', 'U,Kr,P'),
  consumablesWebhook: r('POST', '/consumables/webhook', 'W'),
  purchaseHandoffCreate: r('POST', '/purchases/handoff', 'U'),
  // B18 public, admin, telemetry (spec 05 §6.21, §6.23, §6.24; `/language/*` skipped by decision, see the plan's
  // B18 note). Public routes need no session at all. Admin needs `siteAdmin` on a USER principal specifically —
  // never an API key, whatever its scope — enforced in the handler (there is no per-object permission to check).
  publicTemplatesList: r('GET', '/public/templates', 'P'),
  publicTemplateGet: r('GET', '/public/templates/:builtinKey', 'P'),
  publicConfig: r('GET', '/public/config', 'P'),
  publicNamesDb: r('GET', '/public/names-db/:version', 'P'),
  publicHealthDeep: r('GET', '/public/health/deep', 'P'),
  publicWatermarkedGet: r('GET', '/public/watermarked/:exportId/:token', 'P'),
  purchaseHandoffRedeem: r('POST', '/public/purchases/handoff/redeem', 'P'),
  telemetryCreate: r('POST', '/telemetry', 'U,P'),
  adminUsersLookup: r('GET', '/admin/users', 'U'),
  adminUserRestore: r('POST', '/admin/users/:uid/restore', 'U'),
  adminUserPurge: r('DELETE', '/admin/users/:uid', 'U'),
  adminJobsList: r('GET', '/admin/jobs', 'U'),
  adminJobRetry: r('POST', '/admin/jobs/:id/retry', 'U'),
  adminJobRefund: r('POST', '/admin/jobs/:id/refund', 'U'),
  adminJobKindUpdate: r('PATCH', '/admin/job-kinds/:kind', 'U'),
  adminDocumentMeta: r('GET', '/admin/documents/:did/meta', 'U'),
} as const satisfies Record<string, RouteSpec>;

export type ApiRouteName = keyof typeof API_ROUTES;

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
  scenesBatch: r('POST', '/documents/:did/scenes/batch', 'U,Kr,L', 'document.read'),
  elementsBatch: r('POST', '/documents/:did/elements/batch', 'U,Kr,L', 'document.read'),
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
  aiSuggestionSetsList: r('GET', '/documents/:did/ai/suggestion-sets', 'U,Kr', 'document.read'),
  aiSuggestionSetGet: r('GET', '/ai/suggestion-sets/:ssid', 'U,Kr', 'document.read'),
  aiSuggestionSetAccept: r('POST', '/ai/suggestion-sets/:ssid/accept', 'U,Krw', 'document.edit'),
  aiSuggestionSetReject: r('POST', '/ai/suggestion-sets/:ssid/reject', 'U,Krw', 'document.edit'),
  // B8 tenancy, roles, sharing. Keys (K) only read members and /me/shared; everything else is user-only (403 API_KEY_FORBIDDEN).
  workspaceCreate: r('POST', '/workspaces', 'U'),
  workspaceUpdate: r('PATCH', '/workspaces/:wid', 'U', 'workspace.update'),
  workspaceDelete: r('DELETE', '/workspaces/:wid', 'U', 'workspace.delete'),
  workspaceTransfer: r('POST', '/workspaces/:wid/transfer', 'U', 'workspace.transfer'),
  workspaceLeave: r('POST', '/workspaces/:wid/leave', 'U', 'workspace.leave'),
  workspaceUsage: r('GET', '/workspaces/:wid/usage', 'U', 'workspace.read'),
  workspaceAudit: r('GET', '/workspaces/:wid/audit.csv', 'U', 'workspace.audit'),
  membersList: r('GET', '/workspaces/:wid/members', 'U,Kr', 'members.read'),
  memberUpdate: r('PATCH', '/workspaces/:wid/members/:uid', 'U', 'members.updateRole'),
  memberRemove: r('DELETE', '/workspaces/:wid/members/:uid', 'U', 'members.remove'),
  invitationCreateWorkspace: r('POST', '/workspaces/:wid/invitations', 'U', 'members.invite'),
  invitationCreateProject: r('POST', '/projects/:pid/invitations', 'U', 'share.manage'),
  invitationCreateDocument: r('POST', '/documents/:did/invitations', 'U', 'share.manage'),
  workspaceInvitationsList: r('GET', '/workspaces/:wid/invitations', 'U', 'members.invite'),
  myInvitations: r('GET', '/me/invitations', 'U'),
  invitationRenew: r('POST', '/invitations/:iid/renew', 'U'),
  invitationCancel: r('DELETE', '/invitations/:iid', 'U'),
  invitationAccept: r('POST', '/invitations/accept', 'U'),
  invitationDecline: r('POST', '/invitations/:iid/decline', 'U'),
  sharedWithMe: r('GET', '/me/shared', 'U,Kr'),
  documentLock: r('POST', '/documents/:did/lock', 'U', 'document.lock'),
  documentUnlock: r('DELETE', '/documents/:did/lock', 'U', 'document.lock'),
  documentUnlockSession: r('POST', '/documents/:did/unlock-session', 'U', 'document.read'),
  shareLinkCreateDocument: r('POST', '/documents/:did/share-links', 'U', 'share.manage'),
  shareLinkCreateProject: r('POST', '/projects/:pid/share-links', 'U', 'share.manage'),
  shareLinkCreateSnapshot: r('POST', '/snapshots/:sid/share-links', 'U', 'share.manage'),
  shareLinksListDocument: r('GET', '/documents/:did/share-links', 'U', 'share.manage'),
  shareLinksListProject: r('GET', '/projects/:pid/share-links', 'U', 'share.manage'),
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
  entityGet: r('GET', '/documents/:did/entities/:eid', 'U,Kr,L', 'document.read'),
  entityUsage: r('GET', '/documents/:did/entities/:eid/usage', 'U,Kr,L', 'document.read'),
  entityDialogue: r('GET', '/documents/:did/entities/:eid/dialogue', 'U,Kr,L', 'document.read'),
  tagCategoriesList: r('GET', '/documents/:did/tag-categories', 'U,Kr,L', 'document.read'),
  tagsList: r('GET', '/documents/:did/tags', 'U,Kr,L', 'document.read'),
  notesList: r('GET', '/documents/:did/notes', 'U,Kr,L', 'document.read'),
  beatsList: r('GET', '/documents/:did/beats', 'U,Kr,L', 'document.read'),
  binList: r('GET', '/documents/:did/bin', 'U,Kr,L', 'document.read'),
  revisionsGet: r('GET', '/documents/:did/revisions', 'U,Kr,L', 'document.read'),
  changesList: r('GET', '/documents/:did/changes', 'U,Kr,L', 'document.read'),
  alternatesGet: r('GET', '/documents/:did/alternates/:elementId', 'U,Kr,L', 'document.read'),
  titlePageGet: r('GET', '/documents/:did/title-page', 'U,Kr,L', 'document.read'),
  statsGet: r('GET', '/documents/:did/stats', 'U,Kr,L', 'document.read'),
  fountainGet: r('GET', '/documents/:did/fountain', 'U,Kr,L', 'document.read'),
  sceneShotsList: r('GET', '/documents/:did/scenes/:sceneId/shots', 'U,Kr,L', 'document.read'),
  resolveBatch: r('POST', '/documents/:did/resolve', 'U,Kr,L', 'document.read'),
  resolveOne: r('GET', '/documents/:did/resolve', 'U,Kr,L', 'document.read'),
  documentSearch: r('GET', '/documents/:did/search', 'U,Kr,L', 'document.read'),
  workspaceSearch: r('GET', '/workspaces/:wid/search', 'U,Kr', 'workspace.read'),
  search: r('GET', '/search', 'U,Kr'),
  reportKinds: r('GET', '/reports/kinds', 'U,Kr'),
  reportGet: r('GET', '/documents/:did/reports/:kind', 'U,Kr,L', 'reports.run'),
  reportCreate: r('POST', '/documents/:did/reports', 'U,Kr,L', 'reports.run'),
  packetScene: r('GET', '/documents/:did/packets/scene/:locator', 'U,Kr', 'document.read'),
  packetCharacter: r('GET', '/documents/:did/packets/character/:locator', 'U,Kr', 'document.read'),
  packetLocation: r('GET', '/documents/:did/packets/location/:locator', 'U,Kr', 'document.read'),
  packetShot: r('GET', '/documents/:did/packets/shot/:locator', 'U,Kr', 'document.read'),
} as const satisfies Record<string, RouteSpec>;

export type ApiRouteName = keyof typeof API_ROUTES;

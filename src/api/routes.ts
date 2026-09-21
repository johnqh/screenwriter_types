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
  aiJobsList: r('GET', '/documents/:did/ai/jobs', 'U,Kr', 'ai.review'),
  aiJobGet: r('GET', '/ai/jobs/:jobId', 'U,Kr', 'ai.review'),
  aiJobCancel: r('POST', '/ai/jobs/:jobId/cancel', 'U,Krw', 'ai.run'),
  aiSuggestionSetsList: r('GET', '/documents/:did/ai/suggestion-sets', 'U,Kr', 'ai.review'),
  aiSuggestionSetGet: r('GET', '/ai/suggestion-sets/:ssid', 'U,Kr', 'ai.review'),
  aiSuggestionSetAccept: r('POST', '/ai/suggestion-sets/:ssid/accept', 'U,Krw', 'ai.run'),
  aiSuggestionSetReject: r('POST', '/ai/suggestion-sets/:ssid/reject', 'U,Krw', 'ai.run'),
} as const satisfies Record<string, RouteSpec>;

export type ApiRouteName = keyof typeof API_ROUTES;

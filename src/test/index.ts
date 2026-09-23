/** Fixture factories for consumers' tests (`@sudobility/screenwriter_types/test`). */
import type { Workspace } from '../tenancy/index.js';
import type { Project, DocumentMeta } from '../projects/index.js';
import type { SnapshotSummary } from '../versions/index.js';

const T = '2026-01-01T00:00:00.000Z';

export function makeWorkspace(over: Partial<Workspace> = {}): Workspace {
  return {
    id: 'ws_test',
    kind: 'personal',
    name: 'Personal',
    avatarAssetId: null,
    defaultTemplateId: null,
    defaultLanguage: 'en',
    aiEnabled: true,
    allowPublicLinks: true,
    createdAt: T,
    updatedAt: T,
    ...over,
  };
}

export function makeProject(over: Partial<Project> = {}): Project {
  return {
    id: 'prj_test',
    workspaceId: 'ws_test',
    name: 'Untitled Project',
    description: null,
    color: null,
    coverAssetId: null,
    kind: 'feature',
    logline: null,
    documentCount: 0,
    createdAt: T,
    updatedAt: T,
    trashedAt: null,
    role: 'owner',
    folders: [],
    documents: [],
    ...over,
  };
}

export function makeDocumentMeta(
  over: Partial<DocumentMeta> = {}
): DocumentMeta {
  return {
    id: 'doc_test',
    projectId: 'prj_test',
    workspaceId: 'ws_test',
    folderId: null,
    kind: 'script',
    title: 'Untitled Screenplay',
    logline: null,
    color: null,
    labels: [],
    season: null,
    episode: null,
    position: 0,
    language: 'en',
    templateId: null,
    templateVersion: null,
    epoch: 0,
    excludeFromAi: false,
    locked: false,
    pageCount: 0,
    sceneCount: 0,
    wordCount: 0,
    parentSnapshotId: null,
    createdBy: null,
    createdAt: T,
    updatedAt: T,
    lastEditedAt: null,
    trashedAt: null,
    ...over,
  };
}

export function makeSnapshotSummary(
  over: Partial<SnapshotSummary> = {}
): SnapshotSummary {
  return {
    id: 'snap_test',
    documentId: 'doc_test',
    parentId: null,
    name: 'First draft',
    note: null,
    kind: 'manual',
    autoReason: null,
    stats: { pages: 0, scenes: 0, words: 0 },
    createdBy: null,
    createdOnDevice: null,
    createdAt: T,
    receivedAt: T,
    forkedDocumentIds: [],
    hiddenForMe: false,
    noteCount: 0,
    ...over,
  };
}

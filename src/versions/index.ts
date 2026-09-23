import { z } from 'zod';
import { cursorQuerySchema } from '../api/pagination.js';

/** Spec 03 §10.2 (canonical, kebab-case). */
export const SNAPSHOT_AUTO_REASONS = [
  'pre-ai-polish',
  'pre-import',
  'pre-template',
  'pre-open',
  'pre-restore',
  'pre-cherry-pick-bulk',
  'pre-clear-revisions',
  'pre-delete-revision-set',
  'pre-unlock-all-pages',
  'pre-bulk-change-decision',
  'pre-account-transfer',
  'offline-edits',
  'access-revoked',
] as const;
export type SnapshotAutoReason = (typeof SNAPSHOT_AUTO_REASONS)[number];

/** The only reasons a client may send itself. */
export const CLIENT_AUTO_REASONS = ['offline-edits', 'access-revoked'] as const;

export const SNAPSHOT_KINDS = ['manual', 'auto'] as const;
export type SnapshotKind = (typeof SNAPSHOT_KINDS)[number];

export const VERSION_REASONS = [
  'interval',
  'session-end',
  'pre-epoch',
  'pre-restore',
  'daily',
  'reconnect',
] as const;
export type VersionReason = (typeof VERSION_REASONS)[number];

export interface DocStats {
  pages: number;
  scenes: number;
  words: number;
  activeRevisionSetId?: string | null;
}

/** A row of `GET /documents/:did/versions` (spec 05 §6.10). */
export interface VersionPoint {
  id: string;
  createdAt: string;
  contributors: string[];
  stats: DocStats;
  epoch: number;
  reason: VersionReason;
}

/** Snapshot marker interleaved in the version list. */
export interface SnapshotMarker {
  marker: 'snapshot';
  snapshotId: string;
  name: string;
  createdAt: string;
}

export type VersionListItem = VersionPoint | SnapshotMarker;

export interface SnapshotSummary {
  id: string;
  documentId: string;
  parentId: string | null;
  name: string;
  note: string | null;
  kind: SnapshotKind;
  autoReason: SnapshotAutoReason | null;
  stats: DocStats;
  createdBy: string | null;
  createdOnDevice: string | null;
  createdAt: string;
  receivedAt: string;
  forkedDocumentIds: string[];
  hiddenForMe: boolean;
  noteCount: number;
}

/** `GET /documents/:did/snapshots` */
export interface SnapshotListResponse {
  liveParentSnapshotId: string | null;
  snapshots: SnapshotSummary[];
}

export const snapshotCreateSchema = z.object({
  /** Idempotency key, unique per document. */
  clientSnapshotId: z.string().min(1).max(64).optional(),
  name: z.string().trim().min(1).max(120),
  note: z.string().max(2000).optional(),
  kind: z.enum(SNAPSHOT_KINDS).optional(),
  autoReason: z.enum(SNAPSHOT_AUTO_REASONS).optional(),
  sourceEpoch: z.number().int().min(0).optional(),
  assumedParentId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  createdOnDevice: z.string().max(200).optional(),
  /**
   * Client-provided state for offline creation (spec 03 §10.2, spec 05 §6.11): exactly what the writer saw, uploaded through
   * `POST /uploads/state`. With it, `sourceEpoch` may be older than the live epoch (an offline-edits snapshot after an epoch bump).
   */
  state: z.object({ uploadKey: z.string().min(1).max(128) }).optional(),
});
export type SnapshotCreateRequest = z.infer<typeof snapshotCreateSchema>;

export type SnapshotCreateResponse = SnapshotSummary & {
  reparentedLive: boolean;
};

export type SnapshotDetail = SnapshotSummary & {
  parentChain: SnapshotSummary[];
};

export const snapshotOpenSchema = z.object({
  confirm: z.literal(true),
  dryRun: z.boolean().optional(),
});
export type SnapshotOpenRequest = z.infer<typeof snapshotOpenSchema>;

export const snapshotForkSchema = z.object({
  title: z.string().trim().min(1).max(200),
  targetProjectId: z.string().optional(),
});
export type SnapshotForkRequest = z.infer<typeof snapshotForkSchema>;

/** Where a read or compare takes its content from (spec 05 §6.7.1). */
export type SourceRef =
  | { kind: 'live'; documentId: string }
  | { kind: 'snapshot'; snapshotId: string }
  | { kind: 'version'; documentId: string; versionId: string };

export const sourceRefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('live'), documentId: z.string() }),
  z.object({ kind: z.literal('snapshot'), snapshotId: z.string() }),
  z.object({
    kind: z.literal('version'),
    documentId: z.string(),
    versionId: z.string(),
  }),
]);

/** `POST /documents/:did/versions/:vid/snapshot` body. */
export interface VersionSnapshotRequest {
  name: string;
  note?: string;
}

/** `POST /documents/:did/versions/:vid/restore` (bumps the epoch). */
export interface VersionRestoreResponse {
  document: import('../projects/index.js').DocumentMeta;
  epoch: number;
  preRestoreSnapshot: SnapshotSummary;
}

/** `POST /snapshots/:sid/open` (bumps the epoch). */
export interface SnapshotOpenResponse {
  document: import('../projects/index.js').DocumentMeta;
  epoch: number;
  preOpenSnapshot: SnapshotSummary;
}

// ─── B15: restore-as-copy, prefs, notes, comments, compare, history, presence ────────────────────────────────────

/** `POST /documents/:did/versions/:vid/restore-as-copy` (spec 05 §6.10). Response: `DocumentMeta`. */
export const versionRestoreAsCopySchema = z.object({
  title: z.string().trim().min(1).max(200),
  targetProjectId: z.string().optional(),
});
export type VersionRestoreAsCopyRequest = z.infer<
  typeof versionRestoreAsCopySchema
>;

/** `PUT /snapshots/:sid/prefs`: per-user hide; the snapshot row never changes. */
export const snapshotPrefsSchema = z.object({ hidden: z.boolean() });
export type SnapshotPrefsRequest = z.infer<typeof snapshotPrefsSchema>;
export interface SnapshotPrefsResponse {
  hidden: boolean;
}

export const SNAPSHOT_NOTES_MAX = 200;
export const snapshotNoteCreateSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
export type SnapshotNoteCreateRequest = z.infer<
  typeof snapshotNoteCreateSchema
>;
/** Append-only (spec 09 F-SNAP-009): there is no edit or delete route. */
export interface SnapshotNote {
  id: string;
  snapshotId: string;
  body: string;
  authorId: string | null;
  createdAt: string;
}

export const snapshotCommentAnchorSchema = z.object({
  elementId: z.string().min(1),
  offset: z.number().int().min(0),
  length: z.number().int().min(0),
});
export type SnapshotCommentAnchor = z.infer<typeof snapshotCommentAnchorSchema>;
export const snapshotCommentCreateSchema = z.object({
  anchor: snapshotCommentAnchorSchema,
  body: z.string().trim().min(1).max(10_000),
  /** User ids mentioned in the body (notifications are B12). */
  mentions: z.array(z.string().min(1)).max(50).optional(),
});
export type SnapshotCommentCreateRequest = z.infer<
  typeof snapshotCommentCreateSchema
>;
export const snapshotCommentResolveSchema = z.object({ resolved: z.boolean() });
export type SnapshotCommentResolveRequest = z.infer<
  typeof snapshotCommentResolveSchema
>;
/** A review comment on an immutable snapshot (R6). */
export interface SnapshotComment {
  id: string;
  snapshotId: string;
  anchor: SnapshotCommentAnchor;
  body: string;
  mentions: string[];
  authorId: string | null;
  viaLinkId: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  copiedToLiveNoteId: string | null;
  createdAt: string;
}
export const snapshotCommentsQuerySchema = cursorQuerySchema;
export interface CopyToLiveResponse {
  noteId: string;
}

// Compare (spec 03 §11.1)
export const COMPARE_GRANULARITIES = ['scene', 'element', 'word'] as const;
export const TRACKED_CHANGE_MODES = [
  'accept-all',
  'reject-all',
  'as-marked',
] as const;
export const compareRequestSchema = z.object({
  base: sourceRefSchema,
  target: sourceRefSchema,
  granularity: z.enum(COMPARE_GRANULARITIES).default('element'),
  ignoreFormatting: z.boolean().default(false),
  ignoreRevisionMarks: z.boolean().default(false),
  ignoreTrackedChanges: z.enum(TRACKED_CHANGE_MODES).default('as-marked'),
});
export type CompareRequest = z.input<typeof compareRequestSchema>;

/** Above this many combined pages a compare is refused (spec 05 returns a `doc.compare` job; no runner exists, so 413 `COMPARE_TOO_LARGE`). */
export const COMPARE_MAX_PAGES = 400;

export type WordOp = { op: 'equal' | 'insert' | 'delete'; text: string };
export type ElementDiffStatus =
  'unchanged' | 'modified' | 'added' | 'removed' | 'moved' | 'restyled';
export interface ElementDiff {
  status: ElementDiffStatus;
  baseElementId?: string;
  targetElementId?: string;
  alignment: 'id' | 'text';
  styleChange?: { from: string; to: string };
  /** `modified`: only formatting (marks) changed, the words are equal. */
  formattingOnly?: boolean;
  /** Plain text of the side(s), so a client can render a row without loading either document. */
  baseText?: string;
  targetText?: string;
  /** `granularity: "word"`, modified elements only. */
  words?: WordOp[];
}
export type SceneDiffStatus =
  'unchanged' | 'modified' | 'added' | 'removed' | 'moved' | 'moved-modified';
export interface SceneDiff {
  status: SceneDiffStatus;
  baseSceneId?: string;
  targetSceneId?: string;
  alignment: 'id' | 'fuzzy';
  similarity?: number;
  heading?: string;
  /** Empty at `granularity: "scene"`. */
  elements: ElementDiff[];
}
export interface BeatDiff {
  status: 'unchanged' | 'modified' | 'added' | 'removed';
  id: string;
  baseTitle?: string;
  targetTitle?: string;
}
export interface EntityDiff {
  status: 'unchanged' | 'modified' | 'added' | 'removed';
  id: string;
  kind?: string;
  baseName?: string;
  targetName?: string;
}
export interface DocumentDiff {
  scenes: SceneDiff[];
  titlePage: ElementDiff[];
  beats: BeatDiff[];
  entities: EntityDiff[];
  summary: {
    scenesAdded: number;
    scenesRemoved: number;
    scenesModified: number;
    scenesMoved: number;
    wordsAdded: number;
    wordsRemoved: number;
    pageDelta: number;
  };
}

/** `GET /documents/:did/elements/:elementId/history`: newest first (spec 03 §14). */
export const elementHistoryQuerySchema = cursorQuerySchema;
export interface ElementHistoryEntry {
  at: string;
  authors: string[];
  text: string;
  source: 'update' | 'version';
}

/** `GET /documents/:did/presence`: who has the document open on this API instance right now. */
export interface PresenceEntry {
  userId: string;
  displayName: string | null;
  colour: string;
  since: string;
  deviceId: string | null;
  deviceName: string | null;
  mode: 'edit' | 'view';
  role: string;
}

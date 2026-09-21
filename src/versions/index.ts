import { z } from 'zod';

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

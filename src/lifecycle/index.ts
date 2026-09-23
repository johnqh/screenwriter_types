import { z } from 'zod';
import { cursorQuerySchema } from '../api/pagination.js';
import { documentKindSchema } from '../projects/index.js';
import type { Job } from '../jobs/index.js';

/**
 * Project, document and template lifecycle, workspace settings (slice B14; spec 05 §6.2, §6.6, §6.7, §6.26).
 * Folders, move / duplicate / purge / apply template, the workspace documents list and trash, the Shared Bin, the workspace
 * defaults and the batch-watermark contacts. Template CRUD types live in `templates/`.
 */

/** Trashed items are purged (`system.purge`) this many days after they were trashed (spec 05 §17). */
export const TRASH_RETENTION_DAYS = 30;

export interface PurgeScheduledResponse {
  purgeScheduled: true;
}

// ─── project folders (`pfd_`, §6.6) ───────────────────────────────────────────

/** A folder may sit at most this deep (`FOLDER_DEPTH`): the root's children are depth 1. */
export const FOLDER_MAX_DEPTH = 8;

export const projectFolderCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  parentFolderId: z.string().min(1).optional(),
});
export type ProjectFolderCreateRequest = z.infer<
  typeof projectFolderCreateSchema
>;

export const projectFolderUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  /** `null` moves the folder to the project root. */
  parentFolderId: z.string().min(1).nullable().optional(),
  position: z.number().finite().optional(),
});
export type ProjectFolderUpdateRequest = z.infer<
  typeof projectFolderUpdateSchema
>;

/** `DELETE /project-folders/:fid?moveContentsTo=<fid>|root`; without it the contents move up to the folder's own parent. */
export const projectFolderDeleteQuerySchema = z.object({
  moveContentsTo: z.string().min(1).optional(),
});
export type ProjectFolderDeleteQuery = z.infer<
  typeof projectFolderDeleteQuerySchema
>;

export interface ProjectFolderDeleteResponse {
  deleted: true;
}

// ─── projects: purge and duplicate ────────────────────────────────────────────

export const projectPurgeSchema = z.object({ confirmName: z.string() });
export type ProjectPurgeRequest = z.infer<typeof projectPurgeSchema>;

export const projectDuplicateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  targetWorkspaceId: z.string().min(1).optional(),
  includeSnapshots: z.boolean().default(false),
  /** Re-links the source's asset links onto the copy (B11); a no-op when the target is a different workspace. */
  includeAssets: z.boolean().default(false),
});
export type ProjectDuplicateRequest = z.input<typeof projectDuplicateSchema>;

/** `job.result` of a finished `project.duplicate` job. */
export interface ProjectDuplicateResult {
  projectId: string;
  documents: number;
  snapshots: number;
  /** Documents that were not copied: a locked document needs a re-authentication a job cannot give. */
  skipped: { documentId: string; reason: 'locked' }[];
}

// ─── documents: move, duplicate, apply template ───────────────────────────────

export const documentMoveSchema = z.object({
  targetProjectId: z.string().min(1),
  folderId: z.string().min(1).nullable().optional(),
});
export type DocumentMoveRequest = z.infer<typeof documentMoveSchema>;

export const documentDuplicateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  targetProjectId: z.string().min(1).optional(),
  includeSnapshots: z.boolean().default(false),
  includeAssets: z.boolean().default(false),
});
export type DocumentDuplicateRequest = z.input<typeof documentDuplicateSchema>;

/** `POST /documents/:did/template`. `templateVersion` defaults to the template's latest. */
export const documentApplyTemplateSchema = z.object({
  templateId: z.string().min(1),
  templateVersion: z.number().int().min(1).optional(),
  /** Old style id -> style id of the new template, for styles the new template has no counterpart of. */
  mapping: z.record(z.string(), z.string()).optional(),
  dryRun: z.boolean().optional(),
});
export type DocumentApplyTemplateRequest = z.infer<
  typeof documentApplyTemplateSchema
>;

export interface ApplyTemplateDryRunResponse {
  /** Style ids used by elements that have no counterpart (same id, same role or explicit `mapping`) in the new template. */
  unmappedStyles: string[];
  /** Pages of the document after minus before. */
  pageDelta: number;
}
export type ApplyTemplateResponse = Job | ApplyTemplateDryRunResponse;

/** `job.result` of a finished `doc.applyTemplate` job. */
export interface ApplyTemplateResult {
  templateId: string;
  templateVersion: number;
  remapped: number;
  preTemplateSnapshotId: string;
}

// ─── workspace documents and trash ────────────────────────────────────────────

const boolQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

/** `GET /workspaces/:wid/documents`: across every project; `starred` is the caller's own stars (`document_stars`). */
export const workspaceDocumentsQuerySchema = cursorQuerySchema.extend({
  q: z.string().max(200).optional(),
  kind: documentKindSchema.optional(),
  trashed: boolQuery.optional(),
  starred: boolQuery.optional(),
  label: z.string().max(40).optional(),
});
export type WorkspaceDocumentsQuery = z.output<
  typeof workspaceDocumentsQuerySchema
>;

export const TRASH_ITEM_TYPES = ['project', 'document', 'asset'] as const;
export type TrashItemType = (typeof TRASH_ITEM_TYPES)[number];

/** `GET /workspaces/:wid/trash`. A document trashed together with its project is not listed on its own (restore the project). */
export interface TrashItem {
  type: TrashItemType;
  id: string;
  title: string;
  /** A document's project, for the "in <project>" line. */
  projectId: string | null;
  trashedAt: string;
  trashedBy: string | null;
  /** `trashedAt` + `TRASH_RETENTION_DAYS`. */
  purgeAt: string;
}

/** `confirm` must be `EMPTY`: anything else is the server's `CONFIRMATION_MISMATCH`, not a schema error. */
export const trashEmptySchema = z.object({ confirm: z.string() });
export type TrashEmptyRequest = z.infer<typeof trashEmptySchema>;

/** The `system.purge` job's input (also what a purge job row shows in its `requestSummary`). */
export const purgeInputSchema = z.object({
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  documentId: z.string().optional(),
});
export type PurgeInput = z.infer<typeof purgeInputSchema>;
export interface PurgeResult {
  projects: number;
  documents: number;
}

// ─── Shared Bin (`bin_`, §6.26) ───────────────────────────────────────────────

/** Serialised size cap of one snippet (`LIMIT_EXCEEDED`). */
export const PROJECT_BIN_ITEM_MAX_BYTES = 2 * 1024 * 1024;

export interface ProjectBinItem {
  id: string;
  projectId: string;
  title: string;
  /** Frozen `ElementJSON[]`: notes and tags are stripped. */
  elements: Record<string, unknown>[];
  sourceDocumentId: string | null;
  createdBy: string | null;
  createdAt: string;
}

export const projectBinCreateSchema = z.object({
  id: z.string().startsWith('bin_').optional(),
  title: z.string().trim().min(1).max(200).optional(),
  elements: z.array(z.record(z.string(), z.unknown())).min(1),
  sourceDocumentId: z.string().min(1).optional(),
});
export type ProjectBinCreateRequest = z.input<typeof projectBinCreateSchema>;

export interface ProjectBinDeleteResponse {
  deleted: true;
}

// ─── workspace defaults (§6.26) ───────────────────────────────────────────────

export const DEFAULT_PROJECT_ROLES = [
  'admin',
  'writer',
  'commenter',
  'viewer',
] as const;
export type DefaultProjectRole = (typeof DEFAULT_PROJECT_ROLES)[number];

const looseItems = (max: number) => z.array(z.looseObject({})).max(max);

/**
 * What *New document* copies into a document of the workspace (then the two diverge, spec 01 §5.4) and *Save as workspace
 * worksheet* writes to. The lists are open objects owned by spec 09 features.
 */
export const workspaceDefaultsSchema = z.object({
  tagCategories: looseItems(200).default([]),
  revisionColourSets: looseItems(100).default([]),
  noteTypes: looseItems(100).default([]),
  worksheets: looseItems(200).default([]),
  /** The role newly created projects grant workspace members who have none (F-SET-009). */
  defaultProjectRole: z.enum(DEFAULT_PROJECT_ROLES).nullable().default(null),
});
export type WorkspaceDefaultsInput = z.input<typeof workspaceDefaultsSchema>;
export type WorkspaceDefaultsDoc = z.output<typeof workspaceDefaultsSchema>;
export interface WorkspaceDefaults extends WorkspaceDefaultsDoc {
  updatedAt: string;
}
/** Serialised size cap of the defaults document (`LIMIT_EXCEEDED`). */
export const WORKSPACE_DEFAULTS_MAX_BYTES = 256 * 1024;

export const workspaceDefaultsPutSchema = workspaceDefaultsSchema.extend({
  baseUpdatedAt: z.string().min(1),
});
export type WorkspaceDefaultsPutRequest = z.input<
  typeof workspaceDefaultsPutSchema
>;
export interface WorkspaceDefaultsPutResponse {
  updatedAt: string;
}

// ─── contacts (`ctc_`, §6.26) ─────────────────────────────────────────────────

export const WORKSPACE_CONTACTS_BATCH_MAX = 500;

export interface WorkspaceContact {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
}

const contactFields = {
  name: z.string().trim().min(1).max(200),
  company: z.string().trim().max(200).nullable().optional(),
  email: z.string().trim().max(320).nullable().optional(),
};
export const workspaceContactInputSchema = z.object({
  id: z.string().startsWith('ctc_').optional(),
  ...contactFields,
});
/** More than `WORKSPACE_CONTACTS_BATCH_MAX` entries is the server's `LIMIT_EXCEEDED`, not a schema error. */
export const workspaceContactsCreateSchema = z.object({
  contacts: z.array(workspaceContactInputSchema).min(1),
});
export type WorkspaceContactsCreateRequest = z.input<
  typeof workspaceContactsCreateSchema
>;
export const workspaceContactPatchSchema = z.object({
  name: contactFields.name.optional(),
  company: contactFields.company,
  email: contactFields.email,
});
export type WorkspaceContactPatchRequest = z.infer<
  typeof workspaceContactPatchSchema
>;
export const workspaceContactsQuerySchema = cursorQuerySchema.extend({
  q: z.string().max(200).optional(),
});
export type WorkspaceContactsQuery = z.output<
  typeof workspaceContactsQuerySchema
>;
export interface WorkspaceContactDeleteResponse {
  deleted: true;
}

// ─── job inputs (`project.duplicate`, `doc.applyTemplate`, `template.thumbnail`; `system.purge` is `purgeInputSchema`) ───

export const projectDuplicateJobInputSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  targetWorkspaceId: z.string().min(1),
  includeSnapshots: z.boolean(),
  includeAssets: z.boolean(),
});
export type ProjectDuplicateJobInput = z.infer<
  typeof projectDuplicateJobInputSchema
>;

export const applyTemplateJobInputSchema = z.object({
  templateId: z.string().min(1),
  templateVersion: z.number().int().min(1),
  mapping: z.record(z.string(), z.string()).optional(),
});
export type ApplyTemplateJobInput = z.infer<typeof applyTemplateJobInputSchema>;

export const templateThumbnailInputSchema = z.object({
  templateId: z.string().min(1),
  version: z.number().int().min(1),
});
export type TemplateThumbnailInput = z.infer<
  typeof templateThumbnailInputSchema
>;

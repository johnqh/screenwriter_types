import { z } from 'zod';
import { DOCUMENT_KINDS } from '@sudobility/writing_core';
import type { DocumentKind } from '@sudobility/writing_core';
import type { Role } from '../tenancy/index.js';

export { DOCUMENT_KINDS };
export type { DocumentKind };

export const documentKindSchema = z.enum(DOCUMENT_KINDS);

export const SORT_OPTIONS = ['updated', 'name', 'created'] as const;

/** Spec 05 §6.26: a `series` project orders its episodes by `(season, episode)` (F-COL-006). */
export const PROJECT_KINDS = ['feature', 'series', 'play', 'other'] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];
export const projectKindSchema = z.enum(PROJECT_KINDS);

/** Document labels (F-COL-006): at most 20 per document, each 1-40 characters. */
export const DOCUMENT_LABELS_MAX = 20;
export const DOCUMENT_LABEL_MAX_CHARS = 40;
export const documentLabelsSchema = z
  .array(z.string().trim().min(1).max(DOCUMENT_LABEL_MAX_CHARS))
  .max(DOCUMENT_LABELS_MAX);

// ─── Projects (spec 05 §6.6) ────────────────────────────────────────────────

export interface ProjectSummary {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string | null;
  coverAssetId: string | null;
  kind: ProjectKind;
  logline: string | null;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
  trashedAt: string | null;
}

export interface DocumentMeta {
  id: string;
  projectId: string;
  workspaceId: string;
  folderId: string | null;
  kind: DocumentKind;
  title: string;
  logline: string | null;
  color: string | null;
  labels: string[];
  /** Series projects: episodes order by `(season, episode)`. */
  season: number | null;
  episode: number | null;
  position: number;
  language: string;
  templateId: string | null;
  templateVersion: number | null;
  epoch: number;
  excludeFromAi: boolean;
  locked: boolean;
  pageCount: number;
  sceneCount: number;
  wordCount: number;
  parentSnapshotId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lastEditedAt: string | null;
  trashedAt: string | null;
}

export interface ProjectFolder {
  id: string;
  projectId: string;
  parentFolderId: string | null;
  name: string;
  position: number;
}

/** `GET /projects/:pid` */
export interface Project extends ProjectSummary {
  role: Role;
  folders: ProjectFolder[];
  documents: DocumentMeta[];
}

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  coverAssetId: z.string().optional(),
  color: z.string().max(32).optional(),
  kind: projectKindSchema.optional(),
  logline: z.string().max(2000).optional(),
});
export type ProjectCreateRequest = z.infer<typeof projectCreateSchema>;

export const projectUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  coverAssetId: z.string().nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  kind: projectKindSchema.optional(),
  logline: z.string().max(2000).nullable().optional(),
  workspaceId: z.string().optional(),
});
export type ProjectUpdateRequest = z.infer<typeof projectUpdateSchema>;

export const projectListQuerySchema = z.object({
  trashed: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  q: z.string().optional(),
  sort: z.enum(SORT_OPTIONS).optional(),
});
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

// ─── Documents (spec 05 §6.7) ───────────────────────────────────────────────

export const documentCreateSchema = z.object({
  /** Client-generated `doc_...`; creation is idempotent on it. */
  id: z.string().startsWith('doc_').optional(),
  title: z.string().trim().min(1).max(200),
  kind: documentKindSchema,
  folderId: z.string().optional(),
  templateId: z.string().optional(),
  templateVersion: z.number().int().positive().optional(),
  language: z.string().max(16).optional(),
  labels: documentLabelsSchema.optional(),
  season: z.number().int().min(0).max(9999).optional(),
  episode: z.number().int().min(0).max(99999).optional(),
});
export type DocumentCreateRequest = z.infer<typeof documentCreateSchema>;

export const documentUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  folderId: z.string().nullable().optional(),
  position: z.number().optional(),
  color: z.string().max(32).nullable().optional(),
  language: z.string().max(16).optional(),
  logline: z.string().max(2000).nullable().optional(),
  excludeFromAi: z.boolean().optional(),
  labels: documentLabelsSchema.optional(),
  season: z.number().int().min(0).max(9999).nullable().optional(),
  episode: z.number().int().min(0).max(99999).nullable().optional(),
});
export type DocumentUpdateRequest = z.infer<typeof documentUpdateSchema>;

export const documentListQuerySchema = z.object({
  trashed: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  folderId: z.string().optional(),
  kind: documentKindSchema.optional(),
  /** `episode` = `(season, episode)` with unnumbered documents last; the default for a `series` project. */
  order: z.enum(['position', 'episode']).optional(),
});
export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;

/** Style row in `DocumentDetail.template` (`code` = shortcut digit, `enter`/`tab` = next style ids). */
export interface DocumentTemplateStyle {
  id: string;
  name: string;
  code: number | null;
  enter: string | null;
  tab: string | null;
}

export interface DocumentTemplateInfo {
  id: string;
  version: number;
  name: string;
  layoutMode: 'flow' | 'panels';
  styles: DocumentTemplateStyle[];
}

/** `GET /documents/:did` (metadata plus live-state facts, no content). */
export interface DocumentDetail extends DocumentMeta {
  role: Role;
  schemaVersion: number;
  template: DocumentTemplateInfo | null;
}

// ─── Trash ──────────────────────────────────────────────────────────────────

export interface TrashResult {
  trashedAt: string;
}

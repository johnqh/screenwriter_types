import { z } from 'zod';
import type { TemplateCategory, TemplateJSON } from '@sudobility/writing_core';

export type TemplateScope = 'builtin' | 'user' | 'workspace';

/** `GET /templates` item (spec 05 §6.8). The full body is writing_core's Template. */
export interface TemplateSummary {
  id: string;
  scope: TemplateScope;
  builtinKey: string | null;
  /** Set for `workspace` templates. */
  workspaceId: string | null;
  name: string;
  description: string | null;
  category: TemplateCategory;
  latestVersion: number;
  /** A first-page thumbnail was rendered (`template.thumbnail` job). Built-ins use static assets, so this is false for them. */
  hasThumbnail: boolean;
  /**
   * BCP-47 (writing_core's `TemplateJSON.locale`), set only for `scope: 'builtin'` — the catalogue's language
   * variants (screenplay-standard, tv-one-hour, ...) each carry one. `user`/`workspace` templates have no locale
   * concept (they're the caller's own authored content, not language variants of a catalog) and never set this.
   */
  locale?: string;
}

/** `GET /templates` query: user templates always; `workspaceId` adds that workspace's; `scope` narrows.
 * `locale` filters built-ins to one BCP-47 language (e.g. the app's current UI language); user/workspace templates
 * are never filtered by it, since they have no locale of their own. */
export const templateListQuerySchema = z.object({
  category: z.string().optional(),
  workspaceId: z.string().optional(),
  scope: z.enum(['builtin', 'user', 'workspace']).optional(),
  locale: z.string().optional(),
});
export type TemplateListQuery = z.infer<typeof templateListQuerySchema>;

/** `GET /templates/:tid?version=`: an older version of a user/workspace template (immutable). */
export const templateGetQuerySchema = z.object({
  version: z.coerce.number().int().min(1).optional(),
});

// ─── B14: template lifecycle (spec 05 §6.8) ─────────────────────────────────

/** The body is validated server-side with writing_core's `TemplateJSON` schema (`TEMPLATE_INVALID` with the issues). */
const templateBody = z.custom<TemplateJSON>(
  (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
  {
    message: 'template must be an object',
  }
);

export const templateCreateSchema = z
  .object({
    scope: z.enum(['user', 'workspace']),
    workspaceId: z.string().min(1).optional(),
    template: templateBody,
  })
  .refine((v) => v.scope !== 'workspace' || !!v.workspaceId, {
    message: 'workspaceId is required for a workspace template',
    path: ['workspaceId'],
  });
export type TemplateCreateRequest = z.input<typeof templateCreateSchema>;

export const templateVersionCreateSchema = z.object({ template: templateBody });
export type TemplateVersionCreateRequest = z.input<
  typeof templateVersionCreateSchema
>;

export const templateUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  category: z.string().min(1).max(40).optional(),
});
export type TemplateUpdateRequest = z.infer<typeof templateUpdateSchema>;

export interface TemplateArchiveResponse {
  archived: true;
}

/** Template file formats: Fadewright's own JSON and the two foreign ones spec 04 §4.3 names. */
export const TEMPLATE_FILE_FORMATS = [
  'fwtemplate',
  'fadein-template',
  'fdxt',
] as const;
export type TemplateFileFormat = (typeof TEMPLATE_FILE_FORMATS)[number];
/** `{ "format": "fadewright-template", "formatVersion": 1, "template": <TemplateJSON> }` (spec 04 §4.3.1). */
export const FWTEMPLATE_FORMAT = 'fadewright-template';
export const FWTEMPLATE_FORMAT_VERSION = 1;

/**
 * `POST /templates/import`. Spec 05's `importId` flow is `templateImportByIdSchema` (B16); this body form (the file inline, like
 * `documents/import`) keeps working. The result is the created template.
 */
export const templateImportSchema = z
  .object({
    scope: z.enum(['user', 'workspace']),
    workspaceId: z.string().min(1).optional(),
    filename: z.string().min(1).max(255),
    contentB64: z.string().min(1),
  })
  .refine((v) => v.scope !== 'workspace' || !!v.workspaceId, {
    message: 'workspaceId is required for a workspace template',
    path: ['workspaceId'],
  });
export type TemplateImportRequest = z.input<typeof templateImportSchema>;

/**
 * The upload flow (B16): `POST /imports {templateTarget, filename, sizeBytes, sha256Hex}`, PUT the file, then
 * `POST /templates/import {importId}`. Scope and workspace come from the upload, never from this request.
 */
export const templateImportByIdSchema = z.object({
  importId: z.string().min(1),
});
export type TemplateImportByIdRequest = z.infer<
  typeof templateImportByIdSchema
>;

/** `GET /templates/:tid/export?format=` (only `fwtemplate` is built). */
export const templateExportQuerySchema = z.object({
  format: z
    .enum(['fwtemplate', 'json', 'fadein-template', 'fdxt'])
    .default('fwtemplate'),
  version: z.coerce.number().int().min(1).optional(),
});
export type TemplateExportQuery = z.infer<typeof templateExportQuerySchema>;

export interface TemplateExportResponse {
  filename: string;
  mimeType: string;
  contentB64: string;
  format: TemplateFileFormat;
}

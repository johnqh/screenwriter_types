import { z } from 'zod';
import { documentKindSchema } from '../projects/index.js';
import { docSourceSchema } from '../reads/index.js';
import type { ConversionReport } from '../formats/index.js';

/**
 * Imports, exports and batch watermark as jobs, plus the upload port they share (slice B16; spec 05 §6.18, §6.1 `uploads`,
 * §13). The synchronous `POST /projects/:pid/documents/import`, `POST /documents/:did/export` and `GET /formats` (see
 * `formats/`) stay until the app migrates.
 *
 * Formats are exactly what `writing_formats` has today: import Fountain, FDX and Fade In; export Fountain, FDX and the plain
 * JSON backup. PDF, DOCX, Celtx, Scrivener and OCR answer `IMPORT_FORMAT_UNSUPPORTED` / `EXPORT_FORMAT_UNSUPPORTED` /
 * `OCR_UNAVAILABLE`; nothing fakes them.
 */

/** Formats `POST /imports` accepts (a job kind `import.<format>` exists for each). */
export const JOB_IMPORT_FORMATS = ['fountain', 'fdx', 'fadein'] as const;
export type JobImportFormat = (typeof JOB_IMPORT_FORMATS)[number];
/** Formats an export job produces (`export.<format>`). */
export const JOB_EXPORT_FORMATS = ['fountain', 'fdx', 'json'] as const;
export type JobExportFormat = (typeof JOB_EXPORT_FORMATS)[number];
/** `POST /documents/export-combined` takes these (spec 05: pdf, fdx, fountain; pdf is not built). */
export const COMBINED_EXPORT_FORMATS = ['fdx', 'fountain'] as const;
/** At most this many documents in one combined export (the job's `sources` cap). */
export const COMBINED_EXPORT_MAX_DOCUMENTS = 20;
/** At most this many recipients in one batch watermark (spec 05 §6.18). */
export const BATCH_WATERMARK_MAX_RECIPIENTS = 500;

// ─── uploads (spec 05 §6.1 `uploads`, §8) ─────────────────────────────────────

export const UPLOAD_PURPOSES = ['state', 'watermark_lookup', 'import'] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

const sha256HexSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/, 'sha256Hex must be 64 hex characters');

/**
 * `POST /uploads/state`. `purpose` defaults to `state` (a Yjs state blob); `watermark_lookup` is a leaked file for
 * `POST /workspaces/:wid/watermark-lookup`. `import` uploads are created by `POST /imports`, never here.
 */
export const uploadStateRequestSchema = z.object({
  sizeBytes: z.number().int().min(1),
  sha256Hex: sha256HexSchema,
  purpose: z.enum(['state', 'watermark_lookup']).default('state'),
});
export type UploadStateRequest = z.input<typeof uploadStateRequestSchema>;

/** A presigned PUT: send the bytes with `PUT url` (no `Authorization`), then use `uploadKey`. */
export interface UploadStateResponse {
  uploadKey: string;
  url: string;
  /** When the PUT url stops working (`SIGNED_URL_TTL_S`). */
  expiresAt: string;
}

// ─── imports ─────────────────────────────────────────────────────────────────

export const importOptionsSchema = z.object({
  templateId: z.string().min(1).optional(),
  /** `auto`: OCR a PDF without a text layer; `force`; `off`. No OCR exists yet: `force` is `OCR_UNAVAILABLE`. */
  ocr: z.enum(['auto', 'force', 'off']).default('auto'),
  ocrLanguage: z.string().min(2).max(16).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  kind: documentKindSchema.optional(),
  language: z.string().max(16).optional(),
});
export type ImportOptions = z.input<typeof importOptionsSchema>;

const importFileFields = {
  filename: z.string().min(1).max(500),
  sizeBytes: z.number().int().min(1),
  sha256Hex: sha256HexSchema,
  /** Auto-detected from the uploaded bytes when omitted. */
  format: z.string().min(1).max(32).optional(),
  options: importOptionsSchema.optional(),
};

/** `POST /imports`: one of `targetProjectId` (import as a new document) or `templateTarget` (a template file, `POST /templates/import {importId}`). */
export const importCreateSchema = z
  .object({
    targetProjectId: z.string().min(1).optional(),
    templateTarget: z
      .object({
        scope: z.enum(['user', 'workspace']),
        workspaceId: z.string().min(1).optional(),
      })
      .refine((v) => v.scope !== 'workspace' || !!v.workspaceId, {
        message: 'workspaceId is required for a workspace template',
        path: ['workspaceId'],
      })
      .optional(),
    ...importFileFields,
  })
  .refine(
    (v) => (v.targetProjectId ? 1 : 0) + (v.templateTarget ? 1 : 0) === 1,
    {
      message: 'Send exactly one of targetProjectId and templateTarget',
      path: ['targetProjectId'],
    }
  );
export type ImportCreateRequest = z.input<typeof importCreateSchema>;

/** `POST /documents/:did/import-over`: the document is the route's. */
export const importOverSchema = z.object(importFileFields);
export type ImportOverRequest = z.input<typeof importOverSchema>;

/** Both answer this: PUT the file to `upload.url`, then `POST /imports/:importId/start`. No job exists yet. */
export interface ImportCreateResponse {
  importId: string;
  upload: { url: string; expiresAt: string };
}

/** Input stored on `import.<format>` jobs (spec 05 §13). `newDocumentId` is minted at start so a retried run cannot make two documents. */
export const importJobInputSchema = z.object({
  importId: z.string().min(1),
  targetProjectId: z.string().min(1),
  newDocumentId: z.string().min(1),
  filename: z.string().min(1).max(500),
  options: importOptionsSchema.optional(),
});
export type ImportJobInput = z.infer<typeof importJobInputSchema>;

/** Input stored on `doc.importOver` jobs. */
export const importOverJobInputSchema = z.object({
  importId: z.string().min(1),
  documentId: z.string().min(1),
  filename: z.string().min(1).max(500),
  options: importOptionsSchema.optional(),
});
export type ImportOverJobInput = z.infer<typeof importOverJobInputSchema>;

/** One document an import made; the job's outputs carry one `conversion-report.json` per document (`output.documentId`). */
export interface ImportedDocumentRef {
  documentId: string;
  title: string;
  format: string;
}
/** What a finished `import.*` job stores as `result` (also readable from the outputs). */
export interface ImportJobResult {
  documents: ImportedDocumentRef[];
  report: ConversionReport;
}
/** What a finished `doc.importOver` job stores as `result`. */
export interface ImportOverJobResult {
  documentId: string;
  epoch: number;
  preImportSnapshotId: string;
  format: string;
  report: ConversionReport;
}

/** Name of the per-document (import) or per-file (export) conversion report output. */
export const CONVERSION_REPORT_OUTPUT = 'conversion-report.json';

// ─── exports ─────────────────────────────────────────────────────────────────

/** Visible watermark. `text` tokens: `{recipient}`, `{email}`, `{company}`, `{title}`, `{date}`. */
export const watermarkStyleSchema = z.object({
  text: z.string().min(1).max(200).default('{recipient}'),
  opacity: z.number().min(0.05).max(1).optional(),
  position: z
    .enum(['diagonalAscending', 'diagonalDescending', 'horizontal'])
    .optional(),
});
export type WatermarkStyle = z.input<typeof watermarkStyleSchema>;

export const batchWatermarkSchema = z.object({
  recipients: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        email: z.string().trim().min(1).max(320).optional(),
        company: z.string().trim().min(1).max(200).optional(),
      })
    )
    .min(1)
    .max(BATCH_WATERMARK_MAX_RECIPIENTS),
  visible: watermarkStyleSchema.optional(),
  /** Forensic mark. Only a PDF writer can embed one; text formats carry the export code as a visible note (see the API notes). */
  invisible: z.boolean().default(false),
  /** `email` needs the notification slice (B12): refused with `VALIDATION` until then. */
  deliver: z.enum(['download', 'email']).default('download'),
  emailMessage: z.string().max(2000).optional(),
});
export type BatchWatermark = z.input<typeof batchWatermarkSchema>;

export const exportOptionsSchema = z.object({
  /** Download name without extension (default: the document title). */
  filename: z.string().trim().min(1).max(120).optional(),
  batchWatermark: batchWatermarkSchema.optional(),
});
export type ExportOptions = z.input<typeof exportOptionsSchema>;

/** `POST /documents/:did/exports`. `format` is validated by the server (`EXPORT_FORMAT_UNSUPPORTED` for anything but fountain, fdx, json). */
export const exportCreateSchema = z.object({
  format: z.string().min(1).max(32),
  source: docSourceSchema.optional(),
  options: exportOptionsSchema.optional(),
});
export type ExportCreateRequest = z.input<typeof exportCreateSchema>;

/** `POST /documents/export-combined`: the first document's title page and template, bodies concatenated in the order given. */
export const exportCombinedSchema = z.object({
  documentIds: z
    .array(z.string().min(1))
    .min(1)
    .max(COMBINED_EXPORT_MAX_DOCUMENTS),
  format: z.string().min(1).max(32),
  options: exportOptionsSchema.omit({ batchWatermark: true }).optional(),
});
export type ExportCombinedRequest = z.input<typeof exportCombinedSchema>;

/** Input stored on `export.<format>` and `watermark.batch` jobs. */
export const exportJobInputSchema = z.object({
  format: z.enum(JOB_EXPORT_FORMATS),
  documentIds: z
    .array(z.string().min(1))
    .max(COMBINED_EXPORT_MAX_DOCUMENTS)
    .optional(),
  source: docSourceSchema.optional(),
  options: exportOptionsSchema.optional(),
});
export type ExportJobInput = z.infer<typeof exportJobInputSchema>;

/** What a finished `watermark.batch` job stores as `result`. `invisibleApplied` is false for every text format. */
export interface WatermarkBatchResult {
  recipients: number;
  format: JobExportFormat;
  visibleApplied: boolean;
  invisibleApplied: boolean;
  /** How the export code travels in the file. */
  codeCarrier: 'fountain-note' | 'fdx-comment' | 'json-field';
}

// ─── watermark lookup ────────────────────────────────────────────────────────

/** Prefix of an export code as printed in a file: `FWX-` + 26 base32 characters (128 random bits). */
export const EXPORT_CODE_PREFIX = 'FWX-';

/** `{exportId}` or `{pdfUploadKey}` (a leaked file uploaded through `/uploads/state` with `purpose: "watermark_lookup"`). */
export const watermarkLookupSchema = z
  .object({
    exportId: z.string().trim().min(8).max(64).optional(),
    pdfUploadKey: z.string().min(1).max(100).optional(),
  })
  .refine((v) => (v.exportId ? 1 : 0) + (v.pdfUploadKey ? 1 : 0) === 1, {
    message: 'Send exactly one of exportId and pdfUploadKey',
    path: ['exportId'],
  });
export type WatermarkLookupRequest = z.input<typeof watermarkLookupSchema>;

export interface WatermarkMatch {
  exportId: string;
  recipient: { name: string; email: string | null; company: string | null };
  documentId: string | null;
  documentTitle: string | null;
  /** Display name (else email) of who ran the export. */
  exportedBy: string | null;
  exportedAt: string;
  source: {
    documentId: string | null;
    kind: 'live' | 'snapshot' | 'version';
    snapshotId?: string;
    versionId?: string;
  };
}
export interface WatermarkLookupResponse {
  matches: WatermarkMatch[];
}

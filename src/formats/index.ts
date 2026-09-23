import { z } from 'zod';
import { documentKindSchema } from '../projects/index.js';
import type { DocumentMeta } from '../projects/index.js';

/** Import and export over HTTP (synchronous; spec 05 §6.18 minus the job framework). */

/** Formats the server can import: ids of `writing_formats`. */
export const IMPORT_FORMAT_IDS = ['fountain', 'fdx', 'fadein'] as const;
export const EXPORT_FORMAT_IDS = ['fountain', 'fdx', 'json'] as const;
export type ExportFormatId = (typeof EXPORT_FORMAT_IDS)[number];

/** Default `IMPORT_MAX_BYTES`: 100 MiB of decoded file bytes. */
export const IMPORT_MAX_BYTES_DEFAULT = 100 * 1024 * 1024;

/** Mirror of `writing_formats` `Diagnostic` (this package cannot depend on it). */
export interface ConversionDiagnostic {
  code: string;
  severity: 'info' | 'warn' | 'loss' | 'error';
  message: string;
  feature: string;
  count: number;
  locations?: {
    elementIndex?: number;
    sourceLine?: number;
    sourcePath?: string;
  }[];
}

/** Mirror of `writing_formats` `ConversionReport` (spec 04 §3.1). */
export interface ConversionReport {
  direction: 'import' | 'export';
  format: string;
  sourceVersion?: string;
  diagnostics: ConversionDiagnostic[];
  stats: {
    elements: number;
    scenes: number;
    pages?: number;
    durationMs: number;
  };
  confidence?: number;
  summary: { info: number; warn: number; loss: number; error: number };
}

/** `POST /projects/:pid/documents/import` (idempotent on `id`, like document create). */
export const documentImportSchema = z.object({
  /** Client-generated `doc_...`; import is idempotent on it. */
  id: z.string().startsWith('doc_').optional(),
  /** Only a hint: the format is detected from the content. */
  filename: z.string().min(1).max(500),
  /** Base64 of the file bytes. */
  contentB64: z.string(),
  /** Defaults to the file's title page title, then the filename. */
  title: z.string().trim().min(1).max(200).optional(),
  kind: documentKindSchema.optional(),
  templateId: z.string().optional(),
  language: z.string().max(16).optional(),
});
export type DocumentImportRequest = z.infer<typeof documentImportSchema>;

export interface DocumentImportResult {
  document: DocumentMeta;
  report: ConversionReport;
  /** Detected source format id. */
  format: string;
}

/** `POST /documents/:did/export` */
export const documentExportSchema = z.object({
  format: z.string().min(1).max(32),
});
export type DocumentExportRequest = { format: ExportFormatId };

export interface DocumentExportResult {
  filename: string;
  mimeType: string;
  contentB64: string;
  report: ConversionReport;
  format: ExportFormatId;
}

/** `GET /formats` */
export interface FormatInfo {
  id: string;
  label: string;
  extensions: string[];
  canImport: boolean;
  canExport: boolean;
}

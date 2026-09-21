import { z } from 'zod';
import type { AiTask } from '../ai/index.js';
import { cursorQuerySchema } from '../api/pagination.js';

/**
 * Generic jobs (spec 05 §6.19, §13; slice B9). A job is one row of `jobs`; `ai_jobs` rows are mirrored as `ai.*`
 * jobs (decision D21a) so `/ai/jobs/:id` and `/jobs/:id` read the same job.
 */

export const JOB_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'cancelled'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const TERMINAL_JOB_STATUSES = ['succeeded', 'failed', 'cancelled'] as const;
export const isTerminalJobStatus = (s: JobStatus): boolean =>
  (TERMINAL_JOB_STATUSES as readonly string[]).includes(s);

export const JOB_LANES = ['ai', 'interactive', 'bulk', 'system', 'provider'] as const;
export type JobLane = (typeof JOB_LANES)[number];

/**
 * Closed vocabulary of job kinds, `<family>.<variant>` (R10). Every kind has a `job_kind_config` row; a kind
 * without a registered runner is seeded disabled and `POST /jobs` answers `JOB_KIND_DISABLED`. Extend by adding a
 * member here and a row in `screenwriter_api/src/services/jobs/kinds.ts`. `test.*` kinds exist only to prove the
 * framework and are enabled only under `AI_TEST_MODE=1`.
 */
export const JOB_KINDS = [
  'ai.review',
  'ai.polish',
  'ai.describe',
  'export.pdf',
  'export.fdx',
  'export.fountain',
  'export.fadein',
  'export.fadewright',
  'export.docx',
  'watermark.batch',
  'import.fdx',
  'import.fountain',
  'import.pdf',
  'import.ocr',
  'import.celtx',
  'import.scrivener',
  'import.fdxt',
  'report.render',
  'doc.applyTemplate',
  'doc.importOver',
  'doc.snapshotOpen',
  'doc.versionRestore',
  'doc.compare',
  'doc.normalize',
  'doc.renormalize',
  'doc.compact',
  'snapshot.project',
  'project.duplicate',
  'asset.derive',
  'account.export',
  'system.emailSend',
  'system.emailDigest',
  'system.writingReminder',
  'system.pushSend',
  'system.purge',
  'system.retentionSweep',
  'template.thumbnail',
  // reserved for media adapters (spec 11 §6.2): registered, seeded disabled
  'image.generate',
  'image.edit',
  'image.upscale',
  'image.turnaround',
  'video.generate',
  'video.extend',
  'video.upscale',
  'video.lipSync',
  'voice.tts',
  'voice.cloneProfile',
  'voice.change',
  'music.generate',
  'sfx.generate',
  'audio.isolate',
  'model3d.generate',
  'model3d.convert',
  'model3d.rig',
  'storyboard.generate',
  'animatic.assemble',
  'timeline.export',
  // framework tests
  'test.echo',
  'test.flaky',
] as const;
export type JobKind = (typeof JOB_KINDS)[number];
export const jobKindSchema = z.enum(JOB_KINDS);

/** The `ai.*` kind an `AiTask` mirrors as (its `subkind` is the task itself). */
export function aiKindForTask(task: AiTask): JobKind {
  return task.startsWith('polish') ? 'ai.polish' : 'ai.review';
}
export const isAiKind = (kind: string): boolean => kind.startsWith('ai.');

export interface JobProgress {
  /** 0..1 */
  fraction: number;
  stage: string | null;
  /** An i18n key plus params, never prose (spec 05 §13.6). */
  message: string | null;
}

export interface JobUsage {
  promptTokens?: number;
  completionTokens?: number;
  model?: string | null;
  pages?: number;
}

/** What `GET /jobs/:id` says about an output: no storage key, no URL (fetch those from `/jobs/:id/outputs`). */
export interface JobOutputSummary {
  name: string;
  mimeType: string;
  sizeBytes: number;
  recipientId?: string;
  assetId?: string;
  documentId?: string;
}

/** `GET /jobs/:jobId` never carries `request` or `result` bodies (spec 05 §10 rule 5), only summaries. */
export interface Job {
  id: string;
  kind: JobKind;
  subkind: string | null;
  status: JobStatus;
  progress: JobProgress;
  documentId: string | null;
  /** Small scalar digest of the request (long strings dropped, arrays counted). */
  requestSummary: Record<string, unknown>;
  sources: JobSource[];
  estimate?: JobEstimate;
  quotedCredits?: number | null;
  chargedCredits?: number | null;
  refundedCredits?: number | null;
  error?: string | null;
  errorCode?: string | null;
  usage?: JobUsage;
  outputs?: JobOutputSummary[];
  cancelRequested: boolean;
  sourcesChangedDuringRun?: boolean | null;
  attempt: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface JobEstimate {
  credits: number;
  billable: boolean;
}

export const jobSourceSchema = z.object({
  documentId: z.string().min(1),
  snapshotId: z.string().min(1).optional(),
  targetKind: z.string().min(1).max(40),
  targetId: z.string().min(1).max(100),
});
export type JobSource = z.infer<typeof jobSourceSchema> & { sourceHash?: string };

/** `POST /jobs`. `idempotencyKey` (or the `Idempotency-Key` header) makes a retried create return the original job. */
export const jobCreateSchema = z.object({
  kind: jobKindSchema,
  input: z.record(z.string(), z.unknown()).default({}),
  sources: z.array(jobSourceSchema).max(20).default([]),
  idempotencyKey: z.string().min(1).max(128).optional(),
  maxCredits: z.number().int().min(0).optional(),
  dryRun: z.boolean().optional(),
});
export type JobCreateRequest = z.input<typeof jobCreateSchema>;

/** `dryRun: true` answers this instead of a job. */
export interface JobDryRunResponse {
  estimate: JobEstimate;
}

/** `?kind=` is exact (`export.pdf`) or a family prefix ending in a dot (`ai.`). */
export const jobListQuerySchema = cursorQuerySchema.extend({
  documentId: z.string().min(1).optional(),
  kind: z
    .string()
    .regex(/^[A-Za-z0-9]+(\.[A-Za-z0-9]*)?$/)
    .optional(),
  status: z.enum(JOB_STATUSES).optional(),
});
export type JobListQuery = z.input<typeof jobListQuerySchema>;

/** `GET /jobs/:jobId?wait=N` long-polls up to N seconds (max 120) until status or progress stage changes. */
export const JOB_WAIT_MAX_S = 120;
export const jobGetQuerySchema = z.object({
  wait: z.coerce.number().int().min(0).max(JOB_WAIT_MAX_S).optional(),
});
export type JobGetQuery = z.input<typeof jobGetQuerySchema>;

export interface JobOutput extends JobOutputSummary {
  /** Signed download URL (or a `data:` URL for a small inline output). */
  url: string;
  expiresAt: string | null;
}
export interface JobOutputsResponse {
  outputs: JobOutput[];
}

/** `GET /jobs/:jobId/recipients` item (batch watermark, B16). */
export interface JobRecipient {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  exportId: string;
  emailedAt: string | null;
  firstDownloadedAt: string | null;
  downloadCount: number;
}

/** `POST /webhooks/jobs/:adapterId`: every verified delivery answers this. */
export interface JobWebhookResponse {
  ok: true;
}

/** Header carrying `sha256=<hex HMAC-SHA256(secret, raw body)>` on a provider webhook. */
export const JOB_WEBHOOK_SIGNATURE_HEADER = 'X-Webhook-Signature';

/** The generic `Idempotency-Key` header (spec 05 §6.25). Values are 1-128 characters. */
export const IDEMPOTENCY_HEADER = 'Idempotency-Key';
export const IDEMPOTENT_REPLAY_HEADER = 'Idempotent-Replayed';
export const idempotencyKeySchema = z.string().min(1).max(128);

import { z } from 'zod';
import { cursorQuerySchema } from '../api/pagination.js';
import { JOB_STATUSES } from '../jobs/index.js';

/**
 * Admin routes (spec 05 §6.23): `/api/v1/admin/*` requires `siteAdmin` on a user principal (never an API key).
 * Every call writes `audit_log`.
 */

export interface AdminUserLookup {
  id: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  siteAdmin: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  deletionScheduledFor: string | null;
  deletedAt: string | null;
}

export const adminJobListQuerySchema = cursorQuerySchema.extend({
  status: z.enum(JOB_STATUSES).optional(),
  kind: z.string().optional(),
});
export interface AdminJobListQuery {
  limit?: number;
  cursor?: string;
  status?: (typeof JOB_STATUSES)[number];
  kind?: string;
}

/** `PATCH /admin/job-kinds/:kind`: a sparse patch onto `job_kind_config`. */
export const adminJobKindPatchSchema = z.object({
  enabled: z.boolean().optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  maxConcurrentPerUser: z.number().int().min(1).nullable().optional(),
  maxConcurrentGlobal: z.number().int().min(1).nullable().optional(),
  timeoutMs: z.number().int().min(1000).optional(),
});
export type AdminJobKindPatchRequest = z.infer<typeof adminJobKindPatchSchema>;

export interface AdminJobKind {
  kind: string;
  enabled: boolean;
  adapter: string;
  lane: string;
  billable: boolean;
  maxAttempts: number;
  maxRetries: number;
  maxConcurrentPerUser: number | null;
  maxConcurrentGlobal: number | null;
  timeoutMs: number;
  updatedAt: string;
}

/** `POST /admin/jobs/:id/refund`: an optional partial amount; defaults to the job's full `chargedCredits`. */
export const adminJobRefundSchema = z.object({
  credits: z.number().int().positive().optional(),
});
export type AdminJobRefundRequest = z.infer<typeof adminJobRefundSchema>;
export interface AdminJobRefundResponse {
  refundedCredits: number;
  balance: number;
}

/** `POST /admin/users/:uid/restore`. */
export interface AdminUserRestoreResponse {
  restored: true;
}

/**
 * `DELETE /admin/users/:uid`: schedules an IMMEDIATE deletion (no grace period) and revokes the user's API keys and
 * share links — the same bounded action `DELETE /me` takes, admin-triggered. **Not** a destructive data purge: no
 * `system.purge` job exists anywhere in this codebase yet to actually delete a user's workspaces/documents/content,
 * and `workspaces.created_by` is `ON DELETE RESTRICT`, so a raw row delete cannot work without first reassigning
 * or deleting every workspace the person created — real work for that job, not this route.
 */
export interface AdminUserPurgeResponse {
  deletionScheduledFor: string;
}

/** `GET /admin/documents/:did/meta`: metadata only, never content. */
export interface AdminDocumentMeta {
  id: string;
  title: string;
  kind: string;
  projectId: string;
  workspaceId: string;
  ownerEmail: string | null;
  epoch: number;
  schemaVersion: number;
  excludeFromAi: boolean;
  createdAt: string;
  trashedAt: string | null;
}

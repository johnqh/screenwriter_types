/**
 * Tenancy management and sharing DTOs (spec 05 §5.3, §5.4, §6.2-6.4, §6.7, §6.21, §8.3), slice B8.
 */
import { z } from 'zod';
import { roleSchema, type Role } from '../tenancy/index.js';

// ─── Workspaces ─────────────────────────────────────────────────────────────

export const TEAM_WORKSPACE_LIMIT = 50;

export const workspaceCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  avatarAssetId: z.string().min(1).nullable().optional(),
});
export type WorkspaceCreateRequest = z.infer<typeof workspaceCreateSchema>;

export const workspaceUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  avatarAssetId: z.string().min(1).nullable().optional(),
  defaultTemplateId: z.string().min(1).nullable().optional(),
  defaultLanguage: z.string().min(2).max(35).optional(),
  aiEnabled: z.boolean().optional(),
});
export type WorkspaceUpdateRequest = z.infer<typeof workspaceUpdateSchema>;

export const workspaceDeleteSchema = z.object({ confirmName: z.string() });
export type WorkspaceDeleteRequest = z.infer<typeof workspaceDeleteSchema>;
/** `DELETE /workspaces/:wid` response (soft delete). */
export interface WorkspaceDeleteResponse {
  deletedAt: string;
}

export const workspaceTransferSchema = z.object({ toUserId: z.string().min(1) });
export type WorkspaceTransferRequest = z.infer<typeof workspaceTransferSchema>;

/** `GET /workspaces/:wid/audit.csv` query: an ISO-8601 range of at most one year. */
export const workspaceAuditQuerySchema = z.object({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
});
export type WorkspaceAuditQuery = z.infer<typeof workspaceAuditQuerySchema>;
export const AUDIT_CSV_COLUMNS = ['created_at', 'actor', 'action', 'target_type', 'target_id', 'ip'] as const;
export const AUDIT_MAX_RANGE_DAYS = 366;

export interface WorkspaceUsage {
  storageBytes: number;
  quotaBytes: number;
  documentCount: number;
  assetCount: number;
}

// ─── Members ────────────────────────────────────────────────────────────────

export interface Member {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  invitedBy: string | null;
  joinedAt: string;
}

export const memberUpdateSchema = z.object({ role: roleSchema });
export type MemberUpdateRequest = z.infer<typeof memberUpdateSchema>;

// ─── Invitations ────────────────────────────────────────────────────────────

export const INVITATION_TARGETS = ['workspace', 'project', 'document'] as const;
export type InvitationTarget = (typeof INVITATION_TARGETS)[number];
export const INVITATION_TTL_DAYS = 14;
export const INVITATION_STATUSES = ['pending', 'accepted', 'declined', 'cancelled', 'expired'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

/** `role` for a workspace invitation is `admin|writer|commenter|viewer` (never `owner`); for a project or document it is a grant role. */
export const invitationCreateSchema = z.object({
  email: z.email().max(254),
  role: roleSchema,
});
export type InvitationCreateRequest = z.infer<typeof invitationCreateSchema>;

/** The token is never in this shape: it travels only in the invitation email (`notifyInvitation`, slice B12). */
export interface Invitation {
  id: string;
  targetType: InvitationTarget;
  workspaceId: string;
  projectId: string | null;
  documentId: string | null;
  email: string;
  role: Role;
  invitedBy: string;
  /** Inviter's display name or email, and the target's name, so an invitee can recognise it. */
  invitedByName: string | null;
  targetName: string | null;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export const invitationAcceptSchema = z.object({ token: z.string().min(1) });
export type InvitationAcceptRequest = z.infer<typeof invitationAcceptSchema>;
export interface InvitationAcceptResult {
  workspaceId?: string;
  projectId?: string;
  documentId?: string;
}

/** Where an invitation, grant list or link list points. */
export type ShareTarget =
  | { type: 'workspace'; id: string }
  | { type: 'project'; id: string }
  | { type: 'document'; id: string };

// ─── Grants ─────────────────────────────────────────────────────────────────

export interface ShareGrant {
  id: string;
  targetType: 'project' | 'document';
  projectId: string | null;
  documentId: string | null;
  userId: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  grantedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const grantUpdateSchema = z.object({ role: roleSchema });
export type GrantUpdateRequest = z.infer<typeof grantUpdateSchema>;

/** `GET /me/shared` item: a project or document reached through a grant, not through a workspace membership. */
export interface SharedItem {
  type: 'project' | 'document';
  id: string;
  title: string;
  role: Role;
  workspaceId: string;
  /** For a document: its project. */
  projectId: string | null;
  projectName: string | null;
  sharedBy: string | null;
  grantedAt: string;
}

// ─── Share links ────────────────────────────────────────────────────────────

export const SHARE_LINK_ACCESS = ['view', 'comment'] as const;
export type ShareLinkAccess = (typeof SHARE_LINK_ACCESS)[number];
/** `anyone`: the URL alone opens it at `access`. `restricted`: only people on the access list (grants/membership). */
export const SHARE_LINK_GENERAL_ACCESS = ['anyone', 'restricted'] as const;
export type ShareLinkGeneralAccess = (typeof SHARE_LINK_GENERAL_ACCESS)[number];
export const SHARE_LINK_TARGETS = ['project', 'document', 'snapshot'] as const;
export type ShareLinkTarget = (typeof SHARE_LINK_TARGETS)[number];
export const SHARE_LINK_TOKEN_PREFIX = 'fws_';
/** Link session (`fls_...`) lifetime, seconds (spec 05 §5.4). */
export const LINK_SESSION_TTL_S = 900;
export const LINK_SESSION_PREFIX = 'fls_';

export const shareLinkCreateSchema = z.object({
  access: z.enum(SHARE_LINK_ACCESS),
  generalAccess: z.enum(SHARE_LINK_GENERAL_ACCESS).default('anyone'),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  password: z.string().min(1).max(200).optional(),
  allowDownload: z.boolean().default(true),
  watermarkText: z.string().max(200).nullable().optional(),
});
export type ShareLinkCreateRequest = z.input<typeof shareLinkCreateSchema>;

export const shareLinkUpdateSchema = z
  .object({
    access: z.enum(SHARE_LINK_ACCESS).optional(),
    generalAccess: z.enum(SHARE_LINK_GENERAL_ACCESS).optional(),
    expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
    password: z.string().min(1).max(200).optional(),
    clearPassword: z.boolean().optional(),
    allowDownload: z.boolean().optional(),
    watermarkText: z.string().max(200).nullable().optional(),
  })
  .refine(v => !(v.password !== undefined && v.clearPassword), {
    message: 'password and clearPassword are exclusive',
  });
export type ShareLinkUpdateRequest = z.infer<typeof shareLinkUpdateSchema>;

export interface ShareLink {
  id: string;
  targetType: ShareLinkTarget;
  projectId: string | null;
  documentId: string | null;
  snapshotId: string | null;
  access: ShareLinkAccess;
  generalAccess: ShareLinkGeneralAccess;
  /** Last 4 characters of the token, for the UI list. */
  tokenHint: string;
  hasPassword: boolean;
  allowDownload: boolean;
  watermarkText: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
  createdBy: string | null;
  createdAt: string;
}
/** The full token (and so the URL) is returned once, at creation. */
export type ShareLinkCreated = ShareLink & { url: string; token: string };
export interface ShareLinkRevokeResponse {
  revokedAt: string;
}

/** `GET /public/share/:token` (no content, no auth). A restricted link hides the title. */
export interface PublicShareInfo {
  targetType: ShareLinkTarget;
  title: string | null;
  access: ShareLinkAccess;
  generalAccess: ShareLinkGeneralAccess;
  requiresPassword: boolean;
  /** True for a `comment` link: adding a note needs a signed-in user. */
  requiresSignInToComment: boolean;
  expiresAt: string | null;
  allowDownload: boolean;
}

export const shareUnlockSchema = z.object({ password: z.string().max(200).optional() });
export type ShareUnlockRequest = z.infer<typeof shareUnlockSchema>;
/** Also the way to obtain (and renew) a session for a password-less link. Send `linkSession` as `Authorization: Bearer` on `/share/:token/*` and as the sync `link` auth token. */
export interface ShareUnlockResponse {
  linkSession: string;
  expiresAt: string;
  /** What the session allows: `comment` only for a comment link opened by a signed-in user. */
  access: ShareLinkAccess;
}

// ─── Document lock ──────────────────────────────────────────────────────────

export const UNLOCK_SESSION_TTL_S = 1800;
export const REAUTH_MAX_AGE_S = 300;
export interface DocumentLockResponse {
  locked: boolean;
}
export interface UnlockSession {
  sessionToken: string;
  expiresAt: string;
}

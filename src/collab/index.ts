/**
 * Collaboration DTOs (spec 05 §6.15 notes/mentions/chat/activity, §6.16 notifications, §6.24 devices/push,
 * §6.26 `writingReminder` prefs; slice B12). Tables: `note_mentions`, `document_chat_messages`, `activity_events`,
 * `notifications`, `devices`.
 */
import { z } from 'zod';
import { cursorQuerySchema } from '../api/pagination.js';

// ─── Notification kinds and prefs (§6.16, §6.26) ────────────────────────────

export const NOTIFICATION_KINDS = [
  'mention',
  'note_reply',
  'note_on_my_document',
  'snapshot_comment',
  'chat_mention',
  'invitation',
  'share_granted',
  'snapshot_opened_by_collaborator',
  'job_finished',
  'job_failed',
  'ai_suggestions_ready',
  'ai_refunded',
  'export_ready',
  'watermark_batch_sent',
  'writing_reminder',
  'credits_low',
  'purchase_completed',
  'account_deletion_scheduled',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_EMAIL_MODES = ['immediate', 'digest', 'off'] as const;
export type NotificationEmailMode = (typeof NOTIFICATION_EMAIL_MODES)[number];

export interface NotificationKindPrefs {
  inApp: boolean;
  push: boolean;
  email: NotificationEmailMode;
}

/** Kinds that default to an immediate email (the rest default to `digest` or `off`; see `defaultNotificationKindPrefs`). */
const DEFAULT_IMMEDIATE_EMAIL: ReadonlySet<NotificationKind> = new Set([
  'mention',
  'note_reply',
  'chat_mention',
  'invitation',
  'share_granted',
  'job_failed',
  'export_ready',
  'watermark_batch_sent',
  'credits_low',
  'purchase_completed',
  'account_deletion_scheduled',
]);
const DEFAULT_DIGEST_EMAIL: ReadonlySet<NotificationKind> = new Set([
  'snapshot_comment',
  'note_on_my_document',
  'ai_suggestions_ready',
  'ai_refunded',
  'snapshot_opened_by_collaborator',
]);
/** Kinds a person is not plausibly interrupted for, off by default: no email, no push. */
const DEFAULT_QUIET: ReadonlySet<NotificationKind> = new Set([
  'job_finished',
  'writing_reminder',
]);

/** Every kind gets a sane default; a person may override any of `inApp`/`push`/`email` per kind. */
export function defaultNotificationKindPrefs(
  kind: NotificationKind
): NotificationKindPrefs {
  const email: NotificationEmailMode = DEFAULT_IMMEDIATE_EMAIL.has(kind)
    ? 'immediate'
    : DEFAULT_DIGEST_EMAIL.has(kind)
      ? 'digest'
      : 'off';
  return { inApp: true, push: !DEFAULT_QUIET.has(kind), email };
}

export interface NotificationPrefs {
  kinds: Record<NotificationKind, NotificationKindPrefs>;
  /** `HH:MM` local time (§6.26 `system.writingReminder`); `null` = the reminder job never fires for this user. */
  writingReminderTime: string | null;
}

export function defaultNotificationPrefs(): NotificationPrefs {
  return {
    kinds: Object.fromEntries(
      NOTIFICATION_KINDS.map((k) => [k, defaultNotificationKindPrefs(k)])
    ) as Record<NotificationKind, NotificationKindPrefs>,
    writingReminderTime: null,
  };
}

const notificationKindPrefsPatchSchema = z.object({
  inApp: z.boolean().optional(),
  push: z.boolean().optional(),
  email: z.enum(NOTIFICATION_EMAIL_MODES).optional(),
});

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** `PUT /me/notification-prefs`: a sparse per-kind patch (only the kinds/fields given change) plus the reminder time. */
export const notificationPrefsSchema = z.object({
  kinds: z
    .record(z.string(), notificationKindPrefsPatchSchema)
    .refine(
      (obj) =>
        Object.keys(obj).every((k) =>
          (NOTIFICATION_KINDS as readonly string[]).includes(k)
        ),
      {
        message: 'unknown notification kind',
      }
    )
    .optional(),
  writingReminderTime: z
    .string()
    .regex(HHMM_RE, 'writingReminderTime must be HH:MM (24h, local)')
    .nullable()
    .optional(),
});
export type NotificationPrefsUpdate = z.infer<typeof notificationPrefsSchema>;

/** `{...current, ...update}` per kind (a patch's fields win); `writingReminderTime` replaces whole. */
export function mergeNotificationPrefs(
  current: NotificationPrefs,
  update: NotificationPrefsUpdate
): NotificationPrefs {
  const kinds = { ...current.kinds };
  for (const [k, patch] of Object.entries(update.kinds ?? {})) {
    const kind = k as NotificationKind;
    kinds[kind] = {
      ...(kinds[kind] ?? defaultNotificationKindPrefs(kind)),
      ...patch,
    };
  }
  return {
    kinds,
    writingReminderTime:
      update.writingReminderTime === undefined
        ? current.writingReminderTime
        : update.writingReminderTime,
  };
}

// ─── Notifications (§6.16) ───────────────────────────────────────────────────

export interface Notification {
  id: string;
  kind: NotificationKind;
  /** Ids and display strings only; never document/script content (spec 05 §8.7). */
  payload: Record<string, unknown>;
  workspaceId: string | null;
  documentId: string | null;
  readAt: string | null;
  createdAt: string;
}

const boolQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

export const notificationsQuerySchema = cursorQuerySchema.extend({
  unread: boolQuery.optional(),
});
export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;

export const notificationsReadSchema = z
  .object({
    ids: z.array(z.string().min(1)).max(200).optional(),
    all: z.literal(true).optional(),
    before: z.iso.datetime({ offset: true }).optional(),
  })
  .refine(
    (v) => v.ids !== undefined || v.all !== undefined || v.before !== undefined,
    {
      message: 'one of ids, all or before is required',
    }
  );
export type NotificationsReadRequest = z.infer<typeof notificationsReadSchema>;
export interface NotificationsReadResponse {
  updated: number;
}
export interface NotificationDeleteResponse {
  deleted: true;
}

// ─── Notes mentions, mentions-without-access (§6.15) ────────────────────────

export interface MentionWithoutAccess {
  noteId: string;
  replyId?: string;
  userId: string;
  email: string | null;
  createdAt: string;
}

// ─── Chat (§6.15, §8.7 `document_chat_messages`) ────────────────────────────

export const CHAT_BODY_MAX = 4000;
export const CHAT_EDIT_WINDOW_MINUTES = 15;

/** Y.Doc notes use plain `mentions: string[]` (user ids, no offset/length: writing_core's simplification); chat mirrors it in the DTO for consistency with the spec's shape, offset/length optional. */
export const mentionRefSchema = z.object({
  userId: z.string().min(1),
  offset: z.number().int().min(0).optional(),
  length: z.number().int().min(1).optional(),
});
export type MentionRef = z.infer<typeof mentionRefSchema>;

export interface ChatMessage {
  id: string;
  documentId: string;
  authorId: string | null;
  body: string;
  mentions: MentionRef[];
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

export const chatMessageCreateSchema = z.object({
  clientMessageId: z
    .string()
    .min(8)
    .max(64)
    .regex(/^msg_[0-9A-Za-z]+$/, 'clientMessageId must be a msg_ prefixed id'),
  body: z.string().trim().min(1).max(CHAT_BODY_MAX),
  mentions: z.array(mentionRefSchema).max(50).optional(),
});
export type ChatMessageCreateRequest = z.infer<typeof chatMessageCreateSchema>;

export const chatMessageUpdateSchema = z.object({
  body: z.string().trim().min(1).max(CHAT_BODY_MAX),
});
export type ChatMessageUpdateRequest = z.infer<typeof chatMessageUpdateSchema>;

export const chatQuerySchema = cursorQuerySchema.extend({
  before: z.iso.datetime({ offset: true }).optional(),
});
export type ChatQuery = z.infer<typeof chatQuerySchema>;

export interface ChatMessageDeleteResponse {
  deletedAt: string;
}

// ─── Activity (§6.15, §8.7 `activity_events`) ───────────────────────────────

export const ACTIVITY_KINDS = [
  'document.created',
  'document.renamed',
  'document.moved',
  'document.trashed',
  'document.restored',
  'session.edited',
  'snapshot.created',
  'snapshot.opened',
  'snapshot.forked',
  'version.restored',
  'template.applied',
  'import.over',
  'revision.setCreated',
  'locks.changed',
  'changes.decided',
  'ai.jobCompleted',
  'ai.suggestionsDecided',
  'share.granted',
  'share.linkCreated',
  'member.joined',
  'member.left',
  'mcp.commandsApplied',
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTOR_KINDS = ['user', 'mcp', 'api', 'ai', 'system'] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];

export interface ActivitySummary {
  i18nKey: string;
  params?: Record<string, unknown>;
}

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  actorId: string | null;
  actorKind: ActorKind;
  summary: ActivitySummary;
  targetIds: string[];
  createdAt: string;
}
/** `GET /workspaces/:wid/activity` items also carry the document they happened on. */
export interface WorkspaceActivityEvent extends ActivityEvent {
  documentId: string | null;
}

const csvList = (v: unknown) =>
  typeof v === 'string'
    ? v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : v;

export const activityQuerySchema = cursorQuerySchema.extend({
  kinds: z.preprocess(csvList, z.array(z.string())).optional(),
});
export type ActivityQuery = z.infer<typeof activityQuerySchema>;

export const workspaceActivityQuerySchema = cursorQuerySchema.extend({
  projectId: z.string().min(1).optional(),
});
export type WorkspaceActivityQuery = z.infer<
  typeof workspaceActivityQuerySchema
>;

// ─── Devices, push tokens (§6.24) ────────────────────────────────────────────

export const DEVICE_PLATFORMS = [
  'web',
  'ios',
  'ipados',
  'android',
  'macos',
  'windows',
] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

export const PUSH_PLATFORMS = ['apns', 'fcm', 'wns', 'webpush'] as const;
export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

export interface Device {
  id: string;
  displayName: string;
  platform: DevicePlatform;
  appVersion: string;
  lastSeenAt: string;
  revokedAt: string | null;
  /** True for the device making the current request (matched by id). */
  current: boolean;
  /** Per-device: offline availability (F-SAFE-004), local-backup status; never per-user data. */
  settings: Record<string, unknown>;
}

export const deviceCreateSchema = z.object({
  id: z
    .string()
    .min(8)
    .max(64)
    .regex(/^dev_[0-9A-Za-z]+$/, 'id must be a dev_ prefixed id'),
  installId: z.string().min(1).max(128),
  displayName: z.string().trim().min(1).max(80),
  platform: z.enum(DEVICE_PLATFORMS),
  appVersion: z.string().min(1).max(40),
});
export type DeviceCreateRequest = z.infer<typeof deviceCreateSchema>;
export interface DeviceCreateResponse extends Device {
  /** A second live install presenting the same `id` gets a fresh one (spec 03 §12.8); this is that fresh id. */
  reassignedId?: string;
}

export const deviceUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
});
export type DeviceUpdateRequest = z.infer<typeof deviceUpdateSchema>;

export interface DeviceRevokeResponse {
  revokedAt: string;
}

export const pushTokenSetSchema = z.object({
  platform: z.enum(PUSH_PLATFORMS),
  token: z.string().min(1).max(4096),
  environment: z.enum(['production', 'sandbox']).optional(),
});
export type PushTokenSetRequest = z.infer<typeof pushTokenSetSchema>;
export interface PushTokenSetResponse {
  registeredAt: string;
}
export interface PushTokenDeleteResponse {
  deleted: true;
}

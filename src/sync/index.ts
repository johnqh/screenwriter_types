import { z } from 'zod';

/** Spec 03 §2. Subprotocol string is `fadewright-sync.v1`. */
export const SYNC_PROTOCOL_VERSION = 1;
export const SYNC_SUBPROTOCOL = 'fadewright-sync.v1';
export const SYNC_PATH = '/api/v1/sync';
export const SYNC_HEARTBEAT_MS = 25_000;
export const SYNC_MAX_FRAME_BYTES = 1_048_576;
export const SYNC_AUTH_TIMEOUT_MS = 5_000;

/** Numeric message-type codes (spec 03 §2.3). Frame = channelId, messageType, payload. */
export const SYNC_MESSAGE_TYPES = {
  auth: 0,
  authOk: 1,
  authError: 2,
  reauth: 3,
  ping: 4,
  pong: 4,
  subscribe: 10,
  subscribed: 11,
  subscribeError: 12,
  unsubscribe: 13,
  syncStep1: 20,
  syncStep2: 21,
  update: 22,
  ack: 23,
  reject: 24,
  awareness: 30,
  epochChanged: 40,
  roleChanged: 41,
  documentDeleted: 42,
  normalized: 43,
  serverShutdown: 50,
} as const;
export type SyncMessageName = keyof typeof SYNC_MESSAGE_TYPES;

/** Close codes (spec 03 §2.6). */
export const SYNC_CLOSE_CODES = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  MALFORMED_FRAME: 4400,
  AUTH_TIMEOUT_OR_INVALID: 4401,
  ACCOUNT_DISABLED_OR_DEVICE_REVOKED: 4403,
  PROTOCOL_UNSUPPORTED: 4406,
  HEARTBEAT_TIMEOUT: 4408,
  /** Document epoch changed (snapshot open / version restore): resubscribe at the new epoch. */
  EPOCH_CHANGED: 4409,
  FRAME_TOO_LARGE: 4413,
  RATE_LIMITED: 4429,
} as const;
export type SyncCloseCode =
  (typeof SYNC_CLOSE_CODES)[keyof typeof SYNC_CLOSE_CODES];

// ─── Vocabularies ───────────────────────────────────────────────────────────

export const SYNC_AUTH_SCHEMES = ['firebase', 'apikey', 'link'] as const;
export const SYNC_AUTH_ERROR_CODES = [
  'UNAUTHENTICATED',
  'ACCOUNT_DISABLED',
  'DEVICE_REVOKED',
  'LINK_EXPIRED',
  'CLIENT_TOO_OLD',
  'SERVER_TOO_OLD',
] as const;
export const SYNC_SUBSCRIBE_ERROR_CODES = [
  'NOT_FOUND',
  'FORBIDDEN',
  'DOCUMENT_DELETED',
  'EPOCH_MISMATCH',
  'DOCUMENT_LOCKED',
  'CLIENT_TOO_OLD',
] as const;
export const SYNC_REJECT_CODES = [
  'FORBIDDEN',
  'EPOCH_MISMATCH',
  'UPDATE_INVALID',
  'PAYLOAD_TOO_LARGE',
  'SCHEMA_VIOLATION',
] as const;
export const SYNC_SUBSCRIBE_MODES = ['edit', 'view'] as const;
export const SYNC_EPOCH_REASONS = [
  'snapshot-open',
  'import-over',
  'version-restore',
  'schema-migration',
] as const;

const roleOrNone = z.enum([
  'owner',
  'admin',
  'writer',
  'commenter',
  'viewer',
  'none',
]);
const bytes = z.instanceof(Uint8Array);
const uint = z.number().int().min(0);

// ─── Payload schemas (JSON UTF-8 payloads) ──────────────────────────────────

export const authPayloadSchema = z.object({
  scheme: z.enum(SYNC_AUTH_SCHEMES),
  token: z.string(),
  deviceId: z.string(),
  installId: z.string(),
  clientVersion: z.string(),
  schemaVersion: uint,
});
export const authOkPayloadSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  serverSchemaVersion: uint,
  heartbeatMs: uint,
  maxFrameBytes: uint,
});
export const authErrorPayloadSchema = z.object({
  code: z.enum(SYNC_AUTH_ERROR_CODES),
  message: z.string(),
});
export const reauthPayloadSchema = z.object({ token: z.string() });
export const pingPayloadSchema = z.object({ t: z.number() });
export const subscribePayloadSchema = z.object({
  channelId: uint.min(1),
  documentId: z.string(),
  epoch: uint,
  /** base64 state vector */
  stateVector: z.string().optional(),
  mode: z.enum(SYNC_SUBSCRIBE_MODES),
  snapshotId: z.string().optional(),
});
export const subscribedPayloadSchema = z.object({
  documentId: z.string(),
  role: roleOrNone,
  epoch: uint,
  markPermissions: z.unknown(),
  schemaVersion: uint,
});
export const subscribeErrorPayloadSchema = z.object({
  code: z.enum(SYNC_SUBSCRIBE_ERROR_CODES),
  detail: z.unknown().optional(),
});
export const unsubscribePayloadSchema = z.object({ channelId: uint.min(1) });
export const ackPayloadSchema = z.object({
  clientSeq: uint,
  serverSeq: uint,
});
export const rejectPayloadSchema = z.object({
  clientSeq: uint,
  code: z.enum(SYNC_REJECT_CODES),
  detail: z.unknown().optional(),
});
export const epochChangedPayloadSchema = z.object({
  newEpoch: uint,
  reason: z.enum(SYNC_EPOCH_REASONS),
  byUserId: z.string(),
  snapshotId: z.string().optional(),
});
export const roleChangedPayloadSchema = z.object({
  role: roleOrNone,
  markPermissions: z.unknown(),
});
export const documentDeletedPayloadSchema = z.object({
  byUserId: z.string(),
  recoverableUntil: z.string(),
});
export const normalizedPayloadSchema = z.object({
  serverSeq: uint,
  contentHashes: z.record(z.string(), z.string()),
});
export const serverShutdownPayloadSchema = z.object({
  reconnectAfterMs: uint,
});

// ─── Frame schemas: decoded `{channelId, type, payload}` ────────────────────

const ctl = z.literal(0);
const chan = uint.min(1);

export const syncFrameSchema = z.discriminatedUnion('type', [
  z.object({
    channelId: ctl,
    type: z.literal('auth'),
    payload: authPayloadSchema,
  }),
  z.object({
    channelId: ctl,
    type: z.literal('authOk'),
    payload: authOkPayloadSchema,
  }),
  z.object({
    channelId: ctl,
    type: z.literal('authError'),
    payload: authErrorPayloadSchema,
  }),
  z.object({
    channelId: ctl,
    type: z.literal('reauth'),
    payload: reauthPayloadSchema,
  }),
  z.object({
    channelId: ctl,
    type: z.literal('ping'),
    payload: pingPayloadSchema,
  }),
  z.object({
    channelId: ctl,
    type: z.literal('pong'),
    payload: pingPayloadSchema,
  }),
  z.object({
    channelId: ctl,
    type: z.literal('subscribe'),
    payload: subscribePayloadSchema,
  }),
  z.object({
    channelId: chan,
    type: z.literal('subscribed'),
    payload: subscribedPayloadSchema,
  }),
  z.object({
    channelId: chan,
    type: z.literal('subscribeError'),
    payload: subscribeErrorPayloadSchema,
  }),
  z.object({
    channelId: ctl,
    type: z.literal('unsubscribe'),
    payload: unsubscribePayloadSchema,
  }),
  z.object({ channelId: chan, type: z.literal('syncStep1'), payload: bytes }),
  z.object({ channelId: chan, type: z.literal('syncStep2'), payload: bytes }),
  z.object({
    channelId: chan,
    type: z.literal('update'),
    payload: z.object({ epoch: uint, clientSeq: uint, update: bytes }),
  }),
  z.object({
    channelId: chan,
    type: z.literal('ack'),
    payload: ackPayloadSchema,
  }),
  z.object({
    channelId: chan,
    type: z.literal('reject'),
    payload: rejectPayloadSchema,
  }),
  z.object({ channelId: chan, type: z.literal('awareness'), payload: bytes }),
  z.object({
    channelId: chan,
    type: z.literal('epochChanged'),
    payload: epochChangedPayloadSchema,
  }),
  z.object({
    channelId: chan,
    type: z.literal('roleChanged'),
    payload: roleChangedPayloadSchema,
  }),
  z.object({
    channelId: chan,
    type: z.literal('documentDeleted'),
    payload: documentDeletedPayloadSchema,
  }),
  z.object({
    channelId: chan,
    type: z.literal('normalized'),
    payload: normalizedPayloadSchema,
  }),
  z.object({
    channelId: ctl,
    type: z.literal('serverShutdown'),
    payload: serverShutdownPayloadSchema,
  }),
]);
export type SyncFrame = z.infer<typeof syncFrameSchema>;
export type SyncFrameOf<T extends SyncFrame['type']> = Extract<
  SyncFrame,
  { type: T }
>;

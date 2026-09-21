import { z } from 'zod';

/** Personal API keys (`fwk_`), spec 05 4.2 and 6.5. */
export const API_KEY_SCOPES = ['read', 'read_write'] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];
export const apiKeyScopeSchema = z.enum(API_KEY_SCOPES);

/** At most this many active (unrevoked) keys per user. */
export const API_KEY_MAX_ACTIVE = 25;

/** `fwk_` + 8-char public prefix + `_` + 32 bytes base64url secret. */
export const API_KEY_FORMAT_RE = /^fwk_([a-z0-9]{8})_([A-Za-z0-9_-]{43})$/;

/** `GET /api-keys` item. Never contains the secret. */
export interface ApiKeySummary {
  id: string;
  name: string;
  /** The 8-char public prefix. */
  prefix: string;
  workspaceId: string;
  scope: ApiKeyScope;
  ai: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

export const apiKeyCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  workspaceId: z.string().min(1),
  scope: apiKeyScopeSchema,
  ai: z.boolean().default(false),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});
export type ApiKeyCreateRequest = z.input<typeof apiKeyCreateSchema>;

/** `POST /api-keys` response: the only time `key` is ever returned. */
export type ApiKeyCreated = ApiKeySummary & { key: string };

export const apiKeyUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  ai: z.boolean().optional(),
});
export type ApiKeyUpdateRequest = z.infer<typeof apiKeyUpdateSchema>;

/** `DELETE /api-keys/:kid` response. */
export interface ApiKeyRevokeResponse {
  revokedAt: string;
}

/** Sent by API clients so command transactions record the right origin (`fadewright-mcp/<version>`). */
export const CLIENT_HEADER = 'X-Client';
export const MCP_CLIENT_NAME = 'fadewright-mcp';

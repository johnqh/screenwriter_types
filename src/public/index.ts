import { z } from 'zod';

/**
 * Public routes (spec 05 §6.21, B18): no session needed. `/public/templates[/:key]` reuse `TemplateSummary`
 * (templates/index.ts) and writing_core's `TemplateJSON` for the full body.
 */

/** `GET /public/config` (R31): the single client-policy route. Clients below `minClientVersion` show the update
 *  prompt; a call from one is answered `CLIENT_TOO_OLD` (426), read from the `X-Client-Version` request header. */
export interface PublicConfig {
  uiLanguages: string[];
  scriptLanguages: string[];
  assetLimits: Record<string, unknown>;
  maxImportBytes: number;
  importFormats: string[];
  exportFormats: string[];
  aiTasks: { task: string; pricingBasis: string }[];
  aiConsentVersion: number;
  syncProtocolVersion: number;
  docSchemaVersion: number;
  minClientVersion: {
    web: string;
    ios: string;
    android: string;
    macos: string;
    windows: string;
  };
  namesDbVersion: number;
  features: { ocr: boolean; grammar: boolean; push: boolean };
}

/** `GET /public/names-db/:version` (spec 09): served gzipped with a far-future immutable Cache-Control. */
export interface NamesDbEntry {
  name: string;
  gender?: 'f' | 'm' | 'u';
  origins: string[];
}
export interface NamesDbResponse {
  version: number;
  names: NamesDbEntry[];
}

/** `GET /public/health/deep`: readiness, no secrets. */
export interface DeepHealthResponse {
  db: 'ok' | 'error';
  storage: 'ok' | 'unconfigured' | 'error';
  ai: 'ok' | 'unconfigured';
  email: 'ok' | 'unconfigured';
}

/** `GET /public/watermarked/:exportId/:token`: the recipient's download page payload (never the file itself). */
export interface WatermarkedDownloadInfo {
  documentTitle: string;
  senderName: string;
  url: string;
  expiresAt: string;
}

/** `POST /public/purchases/handoff/redeem`: exchanges a handoff token for a Firebase custom token (same uid), so the web page signs in without a password. */
export const purchaseHandoffRedeemSchema = z.object({
  token: z.string().min(1),
});
export type PurchaseHandoffRedeemRequest = z.infer<
  typeof purchaseHandoffRedeemSchema
>;
export interface PurchaseHandoffRedeemResponse {
  customToken: string;
}

// ---- Telemetry (spec 05 §6.24) ----

export const telemetryEventSchema = z.object({
  name: z.string().min(1).max(120),
  ts: z.string(),
  /** Allow-listed, flat properties only: no script text, no free-form nesting. */
  properties: z
    .record(
      z.string(),
      z.union([z.string().max(500), z.number(), z.boolean(), z.null()])
    )
    .optional(),
});
export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;

export const clientErrorReportSchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).optional(),
  context: z
    .record(
      z.string(),
      z.union([z.string().max(500), z.number(), z.boolean(), z.null()])
    )
    .optional(),
});
export type ClientErrorReport = z.infer<typeof clientErrorReportSchema>;

export const telemetryRequestSchema = z.object({
  events: z.array(telemetryEventSchema).max(100),
  errors: z.array(clientErrorReportSchema).max(20).optional(),
});
export type TelemetryRequest = z.infer<typeof telemetryRequestSchema>;
export interface TelemetryResponse {
  accepted: boolean;
}

import { z } from 'zod';
import { cursorQuerySchema } from '../api/pagination.js';

/**
 * The asset library (slice B11; spec 05 §6.13, §8.6, §14.1, spec 11 §3 and §4.5). Assets are workspace files with metadata;
 * bytes never pass through the API (presigned multipart PUT to R2). This file holds the vocabularies, the DTOs and the
 * role-to-target table the server enforces (`ROLE_NOT_ALLOWED_FOR_TARGET`).
 */

// ─── vocabularies ────────────────────────────────────────────────────────────

export const ASSET_KINDS = [
  'image',
  'video',
  'audio',
  'model3d',
  'document',
  'archive',
  'data',
] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];
export const assetKindSchema = z.enum(ASSET_KINDS);

export const ASSET_ROLES = [
  // launch
  'reference',
  'headshot',
  'photo',
  'logo',
  'beat_image',
  'inline_image',
  'panel_reference',
  'location_scout',
  'mood_board',
  'attachment',
  // future production (valid now, unused by launch UI)
  'turnaround',
  'expression_sheet',
  'costume_design',
  'set_concept',
  'set_plan',
  'storyboard_frame',
  'animatic',
  'previz',
  'rendered_video',
  'rendered_shot',
  'dialogue_audio',
  'voice_sample',
  'voice_profile',
  'music_cue',
  'sound_effect',
  'lip_sync',
  'captions',
  'model3d',
  'model3d_rig',
  'texture',
  'lora',
  'timeline',
] as const;
export type AssetRole = (typeof ASSET_ROLES)[number];
export const assetRoleSchema = z.enum(ASSET_ROLES);

export const ASSET_ROLE_GROUPS: Record<
  AssetRole,
  'reference' | 'design' | 'storyboard' | 'video' | 'audio' | '3d' | 'other'
> = {
  reference: 'reference',
  headshot: 'reference',
  photo: 'reference',
  logo: 'other',
  beat_image: 'other',
  inline_image: 'other',
  panel_reference: 'storyboard',
  location_scout: 'reference',
  mood_board: 'reference',
  attachment: 'other',
  turnaround: 'design',
  expression_sheet: 'design',
  costume_design: 'design',
  set_concept: 'design',
  set_plan: 'design',
  storyboard_frame: 'storyboard',
  animatic: 'video',
  previz: 'video',
  rendered_video: 'video',
  rendered_shot: 'video',
  dialogue_audio: 'audio',
  voice_sample: 'audio',
  voice_profile: 'audio',
  music_cue: 'audio',
  sound_effect: 'audio',
  lip_sync: 'video',
  captions: 'other',
  model3d: '3d',
  model3d_rig: '3d',
  texture: '3d',
  lora: 'other',
  timeline: 'other',
};

export const ASSET_TARGET_KINDS = [
  'document',
  'scene',
  'element',
  'shot',
  'entity',
  'beat',
  'title_page',
  'snapshot',
] as const;
export type AssetTargetKind = (typeof ASSET_TARGET_KINDS)[number];
export const assetTargetKindSchema = z.enum(ASSET_TARGET_KINDS);

/**
 * Which target kinds a role may sit on (spec 05 §6.13: "enforces spec 11's role-to-target table"; spec 11 §3.7 lists the
 * roles but not the table, so this is the decision made in B11). A role not listed here may go on any target.
 */
export const ASSET_ROLE_TARGETS: Partial<
  Record<AssetRole, readonly AssetTargetKind[]>
> = {
  headshot: ['entity'],
  turnaround: ['entity'],
  expression_sheet: ['entity'],
  costume_design: ['entity'],
  voice_sample: ['entity'],
  voice_profile: ['entity'],
  set_concept: ['entity', 'scene'],
  set_plan: ['entity', 'scene'],
  location_scout: ['entity', 'scene'],
  beat_image: ['beat'],
  inline_image: ['element'],
  panel_reference: ['element', 'scene', 'shot'],
  logo: ['title_page', 'document'],
  storyboard_frame: ['shot', 'scene'],
  animatic: ['shot', 'scene', 'document'],
  previz: ['shot', 'scene', 'document'],
  rendered_video: ['shot', 'scene', 'document'],
  rendered_shot: ['shot'],
  dialogue_audio: ['element', 'shot', 'scene'],
  music_cue: ['scene', 'shot', 'document'],
  sound_effect: ['scene', 'shot', 'element'],
  lip_sync: ['shot', 'element'],
  captions: ['scene', 'shot', 'document'],
  timeline: ['document', 'scene'],
};
/** Roles that only fit an entity of one kind (checked against `proj_entities.kind`). */
export const ASSET_ROLE_ENTITY_KINDS: Partial<
  Record<AssetRole, readonly string[]>
> = {
  headshot: ['character'],
  turnaround: ['character'],
  expression_sheet: ['character'],
  costume_design: ['character'],
  voice_sample: ['character'],
  voice_profile: ['character'],
  set_concept: ['location'],
  set_plan: ['location'],
  location_scout: ['location'],
};

export const ASSET_ORIGINS = [
  'upload',
  'import',
  'generated',
  'external_tool',
] as const;
export type AssetOrigin = (typeof ASSET_ORIGINS)[number];

export const ASSET_VERSION_STATUSES = [
  'uploading',
  'processing',
  'ready',
  'failed',
] as const;
export type AssetVersionStatus = (typeof ASSET_VERSION_STATUSES)[number];

export const STALENESS_VALUES = [
  'fresh',
  'stale',
  'target_deleted',
  'unknown',
] as const;
export type Staleness = (typeof STALENESS_VALUES)[number];

/** Multipart parts are this big (the last one smaller); an upload of at most one part is a single presigned PUT. */
export const ASSET_PART_SIZE_BYTES = 8 * 1024 * 1024;
/** How many part PUTs the client helper runs at once. */
export const ASSET_UPLOAD_CONCURRENCY = 3;
/** Presigned part URLs and the upload itself live this long (seconds); a resume re-signs. */
export const ASSET_UPLOAD_TTL_S = 3600;
/** Presigned GET lifetime for `GET /assets/:aid/versions/:vid/url` (seconds). */
export const ASSET_URL_TTL_S = 300;

/** Largest original per kind (spec 11 §3.2). */
export const ASSET_MAX_BYTES: Record<AssetKind, number> = {
  image: 100 * 1024 ** 2,
  video: 10 * 1024 ** 3,
  audio: 2 * 1024 ** 3,
  model3d: 5 * 1024 ** 3,
  document: 200 * 1024 ** 2,
  archive: 10 * 1024 ** 3,
  data: 50 * 1024 ** 2,
};

/** Extension -> kind and the MIME types accepted for it (spec 11 §3.2). The extension must be listed and the magic bytes must agree. */
export const ASSET_EXTENSIONS: Record<
  string,
  { kind: AssetKind; mimes: readonly string[] }
> = {
  '.png': { kind: 'image', mimes: ['image/png'] },
  '.jpg': { kind: 'image', mimes: ['image/jpeg'] },
  '.jpeg': { kind: 'image', mimes: ['image/jpeg'] },
  '.webp': { kind: 'image', mimes: ['image/webp'] },
  '.avif': { kind: 'image', mimes: ['image/avif'] },
  '.gif': { kind: 'image', mimes: ['image/gif'] },
  '.heic': { kind: 'image', mimes: ['image/heic'] },
  '.heif': { kind: 'image', mimes: ['image/heif'] },
  '.svg': { kind: 'image', mimes: ['image/svg+xml'] },
  '.tif': { kind: 'image', mimes: ['image/tiff'] },
  '.tiff': { kind: 'image', mimes: ['image/tiff'] },
  '.exr': { kind: 'image', mimes: ['image/x-exr'] },
  '.psd': { kind: 'image', mimes: ['image/vnd.adobe.photoshop'] },
  '.mp4': { kind: 'video', mimes: ['video/mp4'] },
  '.mov': { kind: 'video', mimes: ['video/quicktime'] },
  '.webm': { kind: 'video', mimes: ['video/webm'] },
  '.mkv': { kind: 'video', mimes: ['video/x-matroska'] },
  '.wav': { kind: 'audio', mimes: ['audio/wav', 'audio/x-wav', 'audio/wave'] },
  '.aif': { kind: 'audio', mimes: ['audio/x-aiff', 'audio/aiff'] },
  '.aiff': { kind: 'audio', mimes: ['audio/x-aiff', 'audio/aiff'] },
  '.flac': { kind: 'audio', mimes: ['audio/flac'] },
  '.mp3': { kind: 'audio', mimes: ['audio/mpeg'] },
  '.aac': { kind: 'audio', mimes: ['audio/aac'] },
  '.m4a': { kind: 'audio', mimes: ['audio/mp4', 'audio/x-m4a'] },
  '.ogg': { kind: 'audio', mimes: ['audio/ogg'] },
  '.opus': { kind: 'audio', mimes: ['audio/ogg', 'audio/opus'] },
  '.glb': { kind: 'model3d', mimes: ['model/gltf-binary'] },
  '.gltf': { kind: 'model3d', mimes: ['model/gltf+json'] },
  '.usdz': { kind: 'model3d', mimes: ['model/vnd.usdz+zip'] },
  '.blend': {
    kind: 'model3d',
    mimes: ['application/x-blender', 'application/octet-stream'],
  },
  '.fbx': {
    kind: 'model3d',
    mimes: ['model/vnd.fbx', 'application/octet-stream'],
  },
  '.obj': { kind: 'model3d', mimes: ['model/obj', 'text/plain'] },
  '.stl': {
    kind: 'model3d',
    mimes: ['model/stl', 'application/sla', 'application/octet-stream'],
  },
  '.usda': { kind: 'model3d', mimes: ['model/vnd.usda', 'text/plain'] },
  '.usdc': {
    kind: 'model3d',
    mimes: ['model/vnd.usda', 'application/octet-stream'],
  },
  '.pdf': { kind: 'document', mimes: ['application/pdf'] },
  '.txt': { kind: 'document', mimes: ['text/plain'] },
  '.md': { kind: 'document', mimes: ['text/markdown'] },
  '.docx': {
    kind: 'document',
    mimes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  '.zip': {
    kind: 'archive',
    mimes: ['application/zip', 'application/x-zip-compressed'],
  },
  '.json': { kind: 'data', mimes: ['application/json'] },
  '.csv': { kind: 'data', mimes: ['text/csv'] },
  '.srt': { kind: 'data', mimes: ['application/x-subrip', 'text/plain'] },
  '.vtt': { kind: 'data', mimes: ['text/vtt'] },
  '.otio': {
    kind: 'data',
    mimes: ['application/otio+json', 'application/json'],
  },
  '.fcpxml': {
    kind: 'data',
    mimes: ['application/x-fcpxml', 'application/xml', 'text/xml'],
  },
  '.edl': { kind: 'data', mimes: ['application/edl', 'text/plain'] },
};

/** `.ext` of a file name, lower-cased ('' when it has none). */
export const assetExtension = (filename: string): string => {
  const m = /(\.[A-Za-z0-9]{1,10})$/.exec(filename);
  return m ? m[1]!.toLowerCase() : '';
};

/** Client-side pre-check that mirrors the server's: null when the file could be accepted, else why not. */
export function checkAssetFile(
  filename: string,
  mimeType: string,
  sizeBytes: number,
  kind: AssetKind
): 'type' | 'mime' | 'kind' | 'size' | null {
  const spec = ASSET_EXTENSIONS[assetExtension(filename)];
  if (!spec) return 'type';
  if (spec.kind !== kind) return 'kind';
  if (!spec.mimes.includes(mimeType.toLowerCase().split(';')[0]!.trim()))
    return 'mime';
  if (sizeBytes > ASSET_MAX_BYTES[kind]) return 'size';
  return null;
}

// ─── rights and provenance (spec 11 §3.6, §3.8) ──────────────────────────────

export const assetRightsSchema = z.object({
  ownership: z
    .enum(['owned', 'licensed', 'public_domain', 'generated', 'unknown'])
    .default('unknown'),
  license: z.string().max(500).optional(),
  attribution: z.string().max(500).optional(),
  sourceUrl: z.string().max(2000).optional(),
  restrictions: z.string().max(1000).optional(),
  expiresAt: z.string().optional(),
  containsLikenessOf: z.array(z.string().max(200)).max(50).optional(),
  consentAssetId: z.string().optional(),
  aiTrainingAllowed: z.boolean().default(false),
});
export type AssetRights = z.output<typeof assetRightsSchema>;

export const assetSourceRefSchema = z.object({
  documentId: z.string(),
  snapshotId: z.string().optional(),
  targetKind: z.enum([
    'document',
    'scene',
    'element',
    'shot',
    'entity',
    'beat',
    'title_page',
  ]),
  targetId: z.string(),
  sourceHash: z.string(),
});
export type AssetSourceRef = z.infer<typeof assetSourceRefSchema>;

/** What a caller may send as `provenance` (the server fills `upload` and `import` itself). */
export const assetProvenanceInputSchema = z.discriminatedUnion('origin', [
  z.object({
    origin: z.literal('external_tool'),
    tool: z.string().min(1).max(100),
    toolVersion: z.string().max(100).optional(),
    description: z.string().max(2000).optional(),
    sourceRefs: z.array(assetSourceRefSchema).max(100).default([]),
    createdVia: z.enum(['mcp', 'api', 'app']).default('api'),
  }),
  z.object({
    origin: z.literal('generated'),
    jobId: z.string().optional(),
    adapter: z.string().min(1).max(100),
    provider: z.string().min(1).max(100),
    model: z.string().max(200).optional(),
    prompt: z.string().max(20000).optional(),
    negativePrompt: z.string().max(20000).optional(),
    parameters: z.record(z.string(), z.unknown()).default({}),
    inputs: z
      .array(
        z.object({
          assetVersionId: z.string().optional(),
          packetHash: z.string().optional(),
          role: z.string(),
        })
      )
      .max(100)
      .default([]),
    sourceRefs: z.array(assetSourceRefSchema).max(100).default([]),
    costCredits: z.number().optional(),
    providerJobId: z.string().optional(),
    createdVia: z.enum(['mcp', 'api', 'app']).default('api'),
  }),
]);
export type AssetProvenanceInput = z.input<typeof assetProvenanceInputSchema>;

/** The stored, immutable provenance of a version (spec 11 §3.6). */
export type AssetProvenance =
  | {
      origin: 'upload';
      uploadedBy: string;
      originalFilename: string;
      client?: Record<string, unknown>;
    }
  | {
      origin: 'import';
      importJobId: string;
      sourceFormat: string;
      originalPath?: string;
    }
  | ({
      origin: 'generated';
      agent?: { client: string; apiKeyId: string };
    } & Record<string, unknown>)
  | ({
      origin: 'external_tool';
      agent?: { client: string; apiKeyId: string };
    } & Record<string, unknown>);

// ─── resources ───────────────────────────────────────────────────────────────

export interface AssetDerivative {
  mime: string;
  sizeBytes: number;
}

export interface AssetVersion {
  id: string;
  assetId: string;
  parentVersionId: string | null;
  versionNumber: number;
  mime: string;
  ext: string;
  sizeBytes: number;
  sha256: string | null;
  status: AssetVersionStatus;
  errorCode: string | null;
  media: Record<string, unknown>;
  /** Derivative name (`thumb_256`, `preview_1600`, `poster`, `proxy_720p`, ...) -> its type and size. Empty until `asset.derive` has run. */
  derivatives: Record<string, AssetDerivative>;
  provenance: AssetProvenance;
  origin: AssetOrigin;
  rights: AssetRights;
  createdBy: string | null;
  createdAt: string;
}

export interface AssetSummary {
  id: string;
  workspaceId: string;
  kind: AssetKind;
  title: string;
  description: string;
  /** Null until the first version is ready (or processing finished without a derive worker: see `status`). */
  currentVersionId: string | null;
  versionCount: number;
  /** Fields of the current version (the latest one when none is current yet). */
  mime: string | null;
  sizeBytes: number | null;
  status: AssetVersionStatus | null;
  origin: AssetOrigin | null;
  rights: AssetRights | null;
  hasThumbnail: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AssetLink {
  id: string;
  workspaceId: string;
  assetId: string;
  /** Null = follow the asset's current version. */
  pinnedVersionId: string | null;
  /** Null = a workspace-level link (its target is `{kind: 'document', id: <workspaceId>}`). */
  documentId: string | null;
  targetKind: AssetTargetKind;
  targetId: string;
  role: AssetRole;
  sortOrder: number;
  sourceHash: string | null;
  sourceSnapshotId: string | null;
  originalTargetId: string | null;
  note: string;
  createdBy: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export type AssetListItem = AssetSummary & {
  role?: AssetRole;
  sortOrder?: number;
};
export type AssetDetail = AssetSummary & {
  versions: AssetVersion[];
  links: AssetLink[];
};

// ─── upload flow (spec 05 §6.13) ─────────────────────────────────────────────

const sha256HexSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/, 'sha256Hex must be 64 hex characters');

export const assetUploadRequestSchema = z.object({
  /** Client-minted `asset_...` id for offline staging; accepted when unused (`ID_CONFLICT` otherwise). */
  assetId: z
    .string()
    .regex(/^asset_[0-9A-Za-z]{10,40}$/)
    .optional(),
  filename: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().min(1),
  sha256Hex: sha256HexSchema.optional(),
  kind: assetKindSchema,
  title: z.string().trim().min(1).max(200).optional(),
  /** A new version of an existing asset: the version it derives from. */
  parentVersionId: z.string().min(1).optional(),
  provenance: assetProvenanceInputSchema.optional(),
  rights: assetRightsSchema.partial().optional(),
});
export type AssetUploadRequest = z.input<typeof assetUploadRequestSchema>;

export interface AssetPartUrl {
  partNumber: number;
  url: string;
  expiresAt: string;
}

export interface AssetUploadInit {
  uploadId: string;
  assetId: string;
  versionId: string;
  partSizeBytes: number;
  partCount: number;
  parts: AssetPartUrl[];
  expiresAt: string;
  /** The workspace already holds these exact bytes: nothing to PUT (`parts` is empty); call complete. */
  deduplicated: boolean;
}

export interface AssetCompletedPart {
  partNumber: number;
  etag: string;
  sizeBytes?: number;
}

export interface AssetUploadStatus {
  uploadId: string;
  assetId: string;
  versionId: string;
  partSizeBytes: number;
  partCount: number;
  completedParts: AssetCompletedPart[];
  expiresAt: string;
  completedAt: string | null;
}

export const assetPartsRequestSchema = z.object({
  partNumbers: z.array(z.number().int().min(1).max(10000)).min(1).max(100),
});
export type AssetPartsRequest = z.infer<typeof assetPartsRequestSchema>;
export interface AssetPartsResponse {
  parts: AssetPartUrl[];
}

export const assetCompleteSchema = z.object({
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().min(1),
        etag: z.string().min(1).max(200),
      })
    )
    .max(10000),
  sha256Hex: sha256HexSchema.optional(),
});
export type AssetCompleteRequest = z.infer<typeof assetCompleteSchema>;

export interface AssetAbortResponse {
  aborted: true;
}

// ─── library routes ──────────────────────────────────────────────────────────

const linkedToSchema = z
  .string()
  .regex(
    /^(entity|scene|shot|element):[A-Za-z0-9_-]+$/,
    'linkedTo is <entity|scene|shot|element>:<id>'
  );

export const assetListQuerySchema = cursorQuerySchema.extend({
  workspaceId: z.string().min(1).optional(),
  documentId: z.string().min(1).optional(),
  linkedTo: linkedToSchema.optional(),
  role: assetRoleSchema.optional(),
  kind: assetKindSchema.optional(),
  q: z.string().trim().min(1).max(200).optional(),
  origin: z.enum(ASSET_ORIGINS).optional(),
});
export type AssetListQuery = z.output<typeof assetListQuerySchema>;

export const assetUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    rights: assetRightsSchema.partial().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export type AssetUpdateRequest = z.input<typeof assetUpdateSchema>;

export const ASSET_URL_VARIANTS = [
  'original',
  'thumb_256',
  'thumb_512',
  'preview_1600',
  'poster',
  'proxy_720p',
  'proxy_1080p',
  'preview',
  'waveform',
  'sprite',
] as const;
export const assetUrlQuerySchema = z.object({
  variant: z
    .string()
    .regex(/^[a-z0-9_]{1,40}$/)
    .default('original'),
});
export type AssetUrlQuery = z.output<typeof assetUrlQuerySchema>;
export interface AssetUrlResponse {
  url: string;
  expiresAt: string;
}

export interface AssetDeleteResponse {
  deletedAt: string;
}

// ─── links ───────────────────────────────────────────────────────────────────

export const assetLinkCreateSchema = z.object({
  assetId: z.string().min(1),
  pinnedVersionId: z.string().min(1).optional(),
  /** Null/omitted = a workspace-level link: the target must then be `{kind: 'document', id: <the workspace id>}`. */
  documentId: z.string().min(1).nullable().optional(),
  target: z.object({
    kind: assetTargetKindSchema,
    id: z.string().min(1).max(200),
  }),
  role: assetRoleSchema,
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
  /** Version-prefixed content hash of the target when the asset was derived from it (spec 11 §4.2). */
  sourceHash: z.string().min(1).max(200).optional(),
  sourceSnapshotId: z.string().min(1).optional(),
  note: z.string().max(2000).optional(),
});
export type AssetLinkCreateRequest = z.input<typeof assetLinkCreateSchema>;

export const assetLinkUpdateSchema = z
  .object({
    role: assetRoleSchema.optional(),
    sortOrder: z.number().int().min(0).max(1_000_000).optional(),
    /** `null` unpins (follow the current version). */
    pinnedVersionId: z.string().min(1).nullable().optional(),
    note: z.string().max(2000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export type AssetLinkUpdateRequest = z.input<typeof assetLinkUpdateSchema>;

const boolQuery = z.enum(['true', 'false']).transform((v) => v === 'true');
export const documentAssetLinksQuerySchema = z.object({
  targetKind: assetTargetKindSchema.optional(),
  targetId: z.string().min(1).optional(),
  role: assetRoleSchema.optional(),
  withStaleness: boolQuery.optional(),
});
export type DocumentAssetLinksQuery = z.output<
  typeof documentAssetLinksQuerySchema
>;
export type AssetLinkWithStaleness = AssetLink & { staleness?: Staleness };

export interface AssetLinkDeleteResponse {
  deletedAt: string;
}

// ─── staleness (spec 11 §4.5) ────────────────────────────────────────────────

export const STALENESS_TARGET_KINDS = [
  'scene',
  'element',
  'shot',
  'entity',
] as const;
export const documentStalenessQuerySchema = z.object({
  targetKind: z.enum(STALENESS_TARGET_KINDS).optional(),
});
export type DocumentStalenessQuery = z.output<
  typeof documentStalenessQuerySchema
>;

/** `GET /documents/:did/staleness`: per target with derived links, for badges. */
export interface TargetStaleness {
  targetKind: (typeof STALENESS_TARGET_KINDS)[number];
  targetId: string;
  fresh: number;
  stale: number;
  deleted: number;
}

export interface LinkStaleness {
  staleness: Staleness;
  /** When the target's hash last changed (the normalizer's record); only for `stale`. */
  changedAt?: string;
  /** Snapshot-target links: how the live document compares (always `fresh` against the snapshot itself). */
  liveStaleness?: Staleness;
  /** Not built (needs the target's old element hashes, spec 11 §4.5's LCS diff); never sent. */
  diffSummary?: { added: number; removed: number; changed: number };
}

// ─── the `asset.derive` job (a documented stub: see the API's CLAUDE.md) ─────

export const assetDeriveInputSchema = z.object({
  assetVersionId: z.string().min(1),
});
export type AssetDeriveInput = z.infer<typeof assetDeriveInputSchema>;

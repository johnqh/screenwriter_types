/**
 * Projection-backed reads (spec 05 §6.7.1, §6.7.2, §6.12, §6.14, §6.15, §6.17), slice B10.
 * The Y.Doc is canonical; these are the shapes the API returns for entities, tags, notes, beats, the Bin,
 * revisions, tracked changes, alternates, title page, statistics, shots, locators and search.
 */
import { z } from 'zod';
import { cursorQuerySchema } from '../api/pagination.js';

// ─── ?source= ───────────────────────────────────────────────────────────────

/** Query encoding of a `SourceRef` (spec 05 §6.7.1): `live`, `snapshot:<snapshotId>` or `version:<versionId>`. */
export const sourceParamSchema = z
  .string()
  .regex(
    /^(live|snapshot:[A-Za-z0-9_-]+|version:[A-Za-z0-9_-]+)$/,
    'source must be live, snapshot:<id> or version:<id>'
  );

/** JSON-body source on a document route: the document is implied by the route (spec 03 `SourceRef` without `documentId`). */
export const docSourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('live') }),
  z.object({ kind: z.literal('snapshot'), snapshotId: z.string().min(1) }),
  z.object({ kind: z.literal('version'), versionId: z.string().min(1) }),
]);
export type DocSource = z.infer<typeof docSourceSchema>;

export const sourceQuerySchema = z.object({
  source: sourceParamSchema.optional(),
});
export type SourceQuery = z.infer<typeof sourceQuerySchema>;

export function sourceParamOf(ref: DocSource | undefined): string | undefined {
  if (!ref || ref.kind === 'live') return undefined;
  return ref.kind === 'snapshot'
    ? `snapshot:${ref.snapshotId}`
    : `version:${ref.versionId}`;
}

// ─── Entities (spec 05 §6.12) ───────────────────────────────────────────────

export const entityListQuerySchema = cursorQuerySchema.extend({
  kind: z.string().min(1).optional(),
  q: z.string().min(1).max(200).optional(),
  source: sourceParamSchema.optional(),
});
export type EntityListQuery = z.infer<typeof entityListQuerySchema>;

export interface EntitySummary {
  id: string;
  kind: string;
  name: string;
  aliases: string[];
  color: string | null;
  sceneCount: number;
  firstSceneId: string | null;
  /** Characters only. */
  dialogueCount?: number;
}

/** A character's age or a location's version (spec 01 §5.8.1), read raw from the Y.Doc. */
export interface EntityVariantSummary {
  id: string;
  label: string;
  ageValue: number | null;
  setting: string | null;
  sortKey: string;
  appearances: { id: string; label: string }[];
}

export interface EntityDetail extends EntitySummary {
  description: string;
  fields: Record<string, unknown>;
  attributes: Record<string, unknown>;
  categoryId: string | null;
  origin: string;
  retain: boolean;
  scenes: { id: string; number: string | null }[];
  tagsByScene: Record<string, string[]>;
  /** Asset links arrive with slice B11: always empty until then. */
  assetLinks: { assetLinkId: string; role: string }[];
  contentHash: string;
  variants: EntityVariantSummary[];
  worksheetIds: string[];
}

export const entityUsageQuerySchema = z.object({
  variantId: z.string().min(1).optional(),
  source: sourceParamSchema.optional(),
});
export type EntityUsageQuery = z.infer<typeof entityUsageQuerySchema>;

export interface SceneRef {
  id: string;
  number: string | null;
  heading?: string;
  synopsis?: string;
}

/**
 * What blocks deleting an entity and what the character and location lists show behind *Show usages*
 * (spec 09 F-TAG-017, F-TAG-021). `total` = cues + headings + tags + arcBeats + noteMentions + assetLinks
 * (`sceneLinks` is the informational scene presence and is not counted).
 */
export interface EntityUsage {
  total: number;
  cues: {
    elementId: string;
    sceneId: string | null;
    sceneNumber: string | null;
    page: string | null;
    variantId: string | null;
  }[];
  headings: {
    sceneId: string;
    sceneNumber: string | null;
    page: string | null;
    variantId: string | null;
  }[];
  sceneLinks: SceneRef[];
  tags: { tagId: string; categoryId: string; sceneId: string | null }[];
  arcBeats: SceneRef[];
  noteMentions: { noteId: string }[];
  assetLinks: { assetLinkId: string; role: string }[];
  byVariant: Record<string, number>;
  /** Uses (cues for a character, headings for a location) that name no variant. */
  unassigned: number;
}

export const entityDialogueQuerySchema = z.object({
  sceneIds: z.string().optional(),
  source: sourceParamSchema.optional(),
});

/** Dialogue Tuner view (spec 05 §6.7.1). */
export interface DialogueSceneView {
  sceneId: string;
  sceneNumber: string | null;
  elements: {
    id: string;
    styleId: string;
    text: string;
    contentHash: string;
  }[];
}

// ─── Tags, notes, beats, bin, revisions, changes, alternates ────────────────

export interface TagCategoryRow {
  id: string;
  key: string | null;
  name: string;
  color: string;
  entityKind: string;
}

export const tagsQuerySchema = z.object({
  sceneId: z.string().optional(),
  categoryId: z.string().optional(),
  entityId: z.string().optional(),
  source: sourceParamSchema.optional(),
});
export interface TagRow {
  id: string;
  categoryId: string;
  entityId: string;
  elementId: string;
  range: { index: number; length: number } | null;
  text: string;
  sceneId: string | null;
}

export const notesQuerySchema = z.object({
  sceneId: z.string().optional(),
  type: z.string().optional(),
  status: z.enum(['open', 'resolved']).optional(),
  source: sourceParamSchema.optional(),
});
export interface NoteSummary {
  id: string;
  anchor: { kind: string; elementId?: string; beatId?: string };
  sceneId: string | null;
  /** The note type's name (falls back to its id). */
  type: string | null;
  typeId: string | null;
  color: string | null;
  title: string;
  body: string;
  author: string | null;
  createdAt: number | null;
  replies: { id: string; author: string; body: string; at: number }[];
  status: 'open' | 'resolved';
  contentHash: string;
}

export interface BeatRow {
  id: string;
  title: string;
  body: string;
  color: string | null;
  x: number | null;
  y: number | null;
  links: { id: string; to: string; label: string }[];
  sceneId?: string;
}

export interface BinRow {
  id: string;
  title: string;
  preview: string;
  createdAt: number;
}

export interface RevisionsView {
  sets: {
    id: string;
    name: string;
    color: string;
    mark: string;
    fullDraft: boolean;
    date: number | null;
  }[];
  activeSetId: string | null;
  revisionMode: boolean;
  trackChanges: boolean;
}

export const changesQuerySchema = z.object({
  authorId: z.string().optional(),
  sceneId: z.string().optional(),
  source: sourceParamSchema.optional(),
});
export interface ChangeRow {
  id: string;
  kind: 'insert' | 'delete' | 'style' | 'fmt';
  authorId: string;
  at: number;
  elementId: string;
  before: string;
  after: string;
}

/** The element's own text is the active alternate (index 0); the inactive ones follow. */
export interface AlternatesView {
  activeIndex: number;
  alternates: { id: string; text: string }[];
}

export interface TitlePageRead {
  fields: Record<string, string>;
  elements: {
    id: string;
    styleId: string;
    text: string;
    field: string | null;
  }[];
  computed: Record<string, unknown>;
}

export interface StatsRead {
  pages: number;
  eighths: number;
  scenes: number;
  words: number;
  elementsByStyle: Record<string, number>;
  estRuntimeMin: number;
  intExt: Record<string, number>;
  dayNight: Record<string, number>;
  dialoguePct: number;
}

export interface ShotRow {
  id: string;
  index: number;
  sceneId: string;
  label: string;
  description: string;
  elementRange: { startElementId: string; endElementId: string } | null;
  camera: Record<string, unknown>;
  estDurationSec: number | null;
  attributes: Record<string, unknown>;
  contentHash: string;
}

export const fountainQuerySchema = z.object({
  sceneIds: z.string().optional(),
  fromSceneId: z.string().optional(),
  source: sourceParamSchema.optional(),
});
/** `GET /documents/:did/fountain` truncates at this many bytes and sets `X-Next-From-Scene`. */
export const FOUNTAIN_MAX_BYTES = 1_000_000;

// ─── Locators (spec 11 §1.3, spec 05 §6.7.2) ────────────────────────────────

export const LOCATOR_KINDS = [
  'scene',
  'element',
  'shot',
  'entity',
  'page',
] as const;
export type LocatorKind = (typeof LOCATOR_KINDS)[number];

export type ResolveResult =
  | { status: 'resolved'; kind: LocatorKind; id: string; label: string }
  | {
      status: 'ambiguous';
      kind: LocatorKind;
      candidates: { id: string; label: string; score: number }[];
    }
  | {
      status: 'not_found';
      kind: LocatorKind;
      suggestions: { id: string; label: string }[];
    };

export const RESOLVE_BATCH_MAX = 200;
export const resolveBatchSchema = z.object({
  locators: z.array(z.string().min(1).max(500)).min(1).max(RESOLVE_BATCH_MAX),
  snapshotId: z.string().min(1).optional(),
});
export type ResolveBatchRequest = z.infer<typeof resolveBatchSchema>;
/** `GET /documents/:did/resolve?ref=&snapshotId=`. */
export const resolveOneQuerySchema = z.object({
  ref: z.string().min(1).max(500),
  snapshotId: z.string().min(1).optional(),
});

// ─── Search (spec 05 §6.17) ─────────────────────────────────────────────────

export const SEARCH_HIT_TYPES = [
  'document',
  'scene',
  'element',
  'entity',
  'note',
  'asset',
] as const;
export type SearchHitType = (typeof SEARCH_HIT_TYPES)[number];

const csv = (v: unknown) =>
  typeof v === 'string'
    ? v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : v;

export const searchQuerySchema = cursorQuerySchema.extend({
  q: z.string().min(1).max(200),
  workspaceId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  documentId: z.string().min(1).optional(),
  types: z.preprocess(csv, z.array(z.enum(SEARCH_HIT_TYPES)).min(1)).optional(),
  styleIds: z.preprocess(csv, z.array(z.string()).min(1)).optional(),
  characterId: z.string().min(1).optional(),
  language: z.string().min(2).max(35).optional(),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

/** `GET /documents/:did/search` (in-document find, spec 05 §6.7.1). */
export const documentSearchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  mode: z.enum(['text', 'regex']).default('text'),
  styles: z.preprocess(csv, z.array(z.string()).min(1)).optional(),
  characters: z.preprocess(csv, z.array(z.string()).min(1)).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  source: sourceParamSchema.optional(),
});
export type DocumentSearchQuery = z.infer<typeof documentSearchQuerySchema>;

export interface DocumentSearchHit {
  sceneId: string | null;
  sceneNumber: string | null;
  elementId: string;
  styleId: string;
  snippet: string;
  page: string | null;
}

export interface SearchHit {
  type: SearchHitType;
  documentId: string | null;
  projectId: string;
  targetId: string;
  title: string;
  /** At most 240 characters; `marks` are `[start, end)` ranges into it (never HTML). */
  snippet: string;
  marks: [number, number][];
  sceneNumber?: string | null;
  pageNumber?: string | null;
  rank: number;
}

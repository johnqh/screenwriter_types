/**
 * Reports (spec 09 §10 F-RPT-000..018, spec 05 §6.18), slice B10.
 *
 * `REPORT_KINDS` belongs in `writing_core` (spec 09 R25) but Tasks 29-35 have not landed there; until they do the
 * vocabulary, the options and the columns live here so the API, the client and MCP share one declaration.
 * A report is a list of tables; CSV, HTML and PDF are all rendered from those same tables, which is what
 * F-RPT-000's acceptance ("CSV and PDF contain the same rows") rests on.
 */
import { z } from 'zod';
import { sourceParamSchema, docSourceSchema } from '../reads/index.js';

export const REPORT_KINDS = [
  'scene',
  'location',
  'character',
  'cast',
  'dialogue',
  'script',
  'text',
  'notes',
  'synopsis',
  'revisions',
  'tags',
  'statistics',
  'inclusivity',
  'presentProgressive',
  'dayOutOfDays',
  'shotList',
  'structure',
  'characterArcs',
] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const REPORT_FORMATS = ['json', 'csv', 'pdf', 'html'] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

/** Documents up to this many pages run a report inline; larger ones answer with a `report.render` job (spec 05 §6.18). */
export const REPORT_SYNC_MAX_PAGES = 200;

export interface ReportOptionDef {
  name: string;
  type: 'boolean' | 'number' | 'string' | 'enum' | 'stringList';
  default?: boolean | number | string | string[];
  values?: readonly string[];
  min?: number;
  max?: number;
  required?: boolean;
  description?: string;
}

export interface ReportColumn {
  id: string;
  label: string;
  align?: 'left' | 'right';
}

export type ReportCell = string | number | null;
export type ReportRow = Record<string, ReportCell>;

export interface ReportTable {
  id: string;
  title?: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  /** Optional totals row, rendered last (CSV, HTML and PDF all include it). */
  footer?: ReportRow;
}

export interface ReportResult {
  kind: ReportKind;
  title: string;
  documentId: string;
  /** `live`, `snapshot:<id>` or `version:<id>`. */
  source: string;
  options: Record<string, unknown>;
  tables: ReportTable[];
  /** Set when the report does not apply (e.g. present-progressive in a language without the construction). */
  notice?: string;
}

export interface ReportKindInfo {
  kind: ReportKind;
  featureId: string;
  title: string;
  /** False until the report is built; running it answers 501 `REPORT_KIND_UNAVAILABLE`. */
  available: boolean;
  unavailableReason?: string;
  options: ReportOptionDef[];
  /** Column ids of the main table(s), in order. */
  columns: ReportColumn[];
  formats: readonly ReportFormat[];
}

const col = (id: string, label: string, align?: 'right'): ReportColumn => ({
  id,
  label,
  ...(align ? { align } : {}),
});
const bool = (
  name: string,
  def: boolean,
  description?: string
): ReportOptionDef => ({
  name,
  type: 'boolean',
  default: def,
  ...(description ? { description } : {}),
});
const list = (name: string, description?: string): ReportOptionDef => ({
  name,
  type: 'stringList',
  default: [],
  ...(description ? { description } : {}),
});
const en = (
  name: string,
  values: readonly string[],
  def: string
): ReportOptionDef => ({ name, type: 'enum', values, default: def });

interface ReportDef {
  featureId: string;
  title: string;
  options: ReportOptionDef[];
  columns: ReportColumn[];
  unavailable?: string;
}

/** Column and option declarations. The tables a report returns use exactly these column ids. */
export const REPORT_DEFS: Record<ReportKind, ReportDef> = {
  scene: {
    featureId: 'F-RPT-001',
    title: 'Scene report',
    options: [
      en(
        'sort',
        ['scriptOrder', 'sceneNumber', 'location', 'scriptDay'],
        'scriptOrder'
      ),
      bool('includeOmitted', false),
    ],
    columns: [
      col('number', 'Scene'),
      col('intro', 'Intro'),
      col('location', 'Location'),
      col('time', 'Time'),
      col('heading', 'Heading'),
      col('page', 'Page'),
      col('length', 'Length'),
      col('estTime', 'Est. time', 'right'),
      col('synopsis', 'Synopsis'),
      col('colour', 'Colour'),
      col('speaking', 'Speaking'),
      col('nonSpeaking', 'Non-speaking'),
      col('scriptDay', 'Script day'),
    ],
  },
  location: {
    featureId: 'F-RPT-002',
    title: 'Location report',
    options: [en('sort', ['name', 'firstAppearance', 'length'], 'name')],
    columns: [
      col('location', 'Location'),
      col('intExt', 'INT/EXT'),
      col('times', 'Times of day'),
      col('scenes', 'Scenes'),
      col('pages', 'Pages'),
      col('eighths', 'Length'),
      col('sceneCount', 'Scene count', 'right'),
    ],
  },
  character: {
    featureId: 'F-RPT-003',
    title: 'Character report',
    options: [
      list('characters', 'Entity ids or names; empty means every character'),
      bool('includeNonSpeaking', false),
      {
        name: 'monologueWords',
        type: 'number',
        default: 100,
        min: 1,
        max: 10000,
      },
      bool('includeDialogue', false),
    ],
    columns: [
      col('character', 'Character'),
      col('scenes', 'Speaking scenes'),
      col('nonSpeakingScenes', 'Non-speaking scenes'),
      col('extensions', 'Extensions'),
      col('parentheticals', 'Parentheticals', 'right'),
      col('monologues', 'Monologues', 'right'),
      col('dialogue', 'Dialogue'),
    ],
  },
  cast: {
    featureId: 'F-RPT-004',
    title: 'Cast report',
    options: [
      en(
        'sort',
        ['alphabetical', 'scriptOrder', 'dialogueCount', 'words'],
        'alphabetical'
      ),
    ],
    columns: [
      col('character', 'Character'),
      col('dialogues', 'Dialogues', 'right'),
      col('words', 'Words', 'right'),
      col('lines', 'Lines', 'right'),
      col('speakingScenes', 'Speaking scenes', 'right'),
      col('totalScenes', 'Total scenes', 'right'),
      col('pagesPresent', 'Pages present'),
      col('firstAppearance', 'First appearance'),
      col('gender', 'Gender'),
      col('role', 'Role'),
      col('age', 'Age'),
    ],
  },
  dialogue: {
    featureId: 'F-RPT-005',
    title: 'Dialogue report',
    options: [
      list('characters', 'Entity ids or names; empty means every character'),
      bool('includeParentheticals', false),
    ],
    columns: [
      col('number', '#', 'right'),
      col('scene', 'Scene'),
      col('page', 'Page'),
      col('character', 'Character'),
      col('text', 'Dialogue'),
    ],
  },
  script: {
    featureId: 'F-RPT-006',
    title: 'Script report',
    options: [list('styles', 'Style ids or roles; empty means every element')],
    columns: [
      col('page', 'Page'),
      col('scene', 'Scene'),
      col('style', 'Style'),
      col('text', 'Text'),
    ],
  },
  text: {
    featureId: 'F-RPT-007',
    title: 'Text report',
    options: [
      {
        name: 'q',
        type: 'string',
        required: true,
        description: 'Text to find',
      },
      en('mode', ['text', 'regex'], 'text'),
      list('styles', 'Restrict to these style ids'),
    ],
    columns: [
      col('page', 'Page'),
      col('scene', 'Scene'),
      col('style', 'Style'),
      col('snippet', 'Context'),
    ],
  },
  notes: {
    featureId: 'F-RPT-008',
    title: 'Notes report',
    options: [
      list('types'),
      list('authors'),
      en('status', ['any', 'open', 'resolved'], 'any'),
      list('colours'),
    ],
    columns: [
      col('order', '#', 'right'),
      col('colour', 'Colour'),
      col('type', 'Type'),
      col('title', 'Title'),
      col('body', 'Note'),
      col('author', 'Author'),
      col('created', 'Created'),
      col('modified', 'Modified'),
      col('page', 'Page'),
      col('scene', 'Scene'),
      col('status', 'Status'),
      col('replies', 'Replies', 'right'),
    ],
  },
  synopsis: {
    featureId: 'F-RPT-009',
    title: 'Synopsis report',
    options: [bool('includeEmpty', true)],
    columns: [
      col('number', 'Scene'),
      col('heading', 'Heading'),
      col('synopsis', 'Synopsis'),
      col('colour', 'Colour'),
    ],
  },
  revisions: {
    featureId: 'F-RPT-010',
    title: 'Revisions report',
    options: [list('sets', 'Revision set ids; empty means every set')],
    columns: [
      col('set', 'Revision'),
      col('colour', 'Colour'),
      col('mark', 'Mark'),
      col('date', 'Date'),
      col('pages', 'Pages'),
      col('scenes', 'Scenes'),
      col('revisedElements', 'Revised elements', 'right'),
    ],
  },
  tags: {
    featureId: 'F-RPT-011',
    title: 'Tags report',
    options: [
      en('mode', ['byScene', 'byCategory'], 'byScene'),
      list('categories', 'Tag category ids; empty means all'),
    ],
    columns: [
      col('scene', 'Scene'),
      col('heading', 'Heading'),
      col('page', 'Page'),
      col('length', 'Length'),
      col('scriptDay', 'Script day'),
      col('category', 'Category'),
      col('entities', 'Entities'),
    ],
  },
  statistics: {
    featureId: 'F-RPT-012',
    title: 'Statistics report',
    options: [
      { name: 'topWords', type: 'number', default: 20, min: 0, max: 200 },
      { name: 'longestScenes', type: 'number', default: 5, min: 0, max: 50 },
    ],
    columns: [col('metric', 'Metric'), col('value', 'Value', 'right')],
  },
  inclusivity: {
    featureId: 'F-RPT-013',
    title: 'Inclusivity and gender analysis',
    options: [en('by', ['gender', 'role'], 'gender')],
    columns: [
      col('group', 'Group'),
      col('characters', 'Characters', 'right'),
      col('dialogues', 'Dialogues', 'right'),
      col('words', 'Words', 'right'),
      col('scenesSpeaking', 'Scenes speaking', 'right'),
      col('wordsPct', 'Words %', 'right'),
    ],
  },
  presentProgressive: {
    featureId: 'F-RPT-014',
    title: 'Present progressive check',
    options: [],
    columns: [
      col('page', 'Page'),
      col('scene', 'Scene'),
      col('match', 'Match'),
      col('text', 'Action line'),
    ],
  },
  dayOutOfDays: {
    featureId: 'F-RPT-015',
    title: 'Day out of days',
    options: [],
    columns: [
      col('character', 'Character'),
      col('workDays', 'Work days', 'right'),
      col('holds', 'Holds', 'right'),
    ],
  },
  shotList: {
    featureId: 'F-RPT-016',
    title: 'Shot list',
    options: [],
    columns: [
      col('scene', 'Scene'),
      col('shot', 'Shot'),
      col('label', 'Label'),
      col('description', 'Description'),
      col('size', 'Size'),
      col('angle', 'Angle'),
      col('movement', 'Movement'),
      col('lens', 'Lens'),
      col('durationSec', 'Duration (s)', 'right'),
    ],
  },
  structure: {
    featureId: 'F-RPT-017',
    title: 'Structure report',
    options: [],
    columns: [
      col('node', 'Act / sequence / beat'),
      col('goal', 'Goal pages'),
      col('actual', 'Actual pages'),
      col('delta', 'Delta', 'right'),
    ],
    unavailable:
      'Outline page goals are not modelled in writing_core yet (spec 01 §5.13 goals), so there is nothing to compare actual pages with',
  },
  characterArcs: {
    featureId: 'F-RPT-018',
    title: 'Character arcs',
    options: [
      list('characters', 'Entity ids or names; empty means every character'),
    ],
    columns: [
      col('character', 'Character'),
      col('scene', 'Scene'),
      col('heading', 'Heading'),
      col('note', 'Arc note'),
    ],
  },
};

export function reportKindInfos(): ReportKindInfo[] {
  return REPORT_KINDS.map((kind) => {
    const d = REPORT_DEFS[kind];
    return {
      kind,
      featureId: d.featureId,
      title: d.title,
      available: !d.unavailable,
      ...(d.unavailable ? { unavailableReason: d.unavailable } : {}),
      options: d.options,
      columns: d.columns,
      formats: REPORT_FORMATS,
    };
  });
}

export const isReportKind = (v: unknown): v is ReportKind =>
  typeof v === 'string' && (REPORT_KINDS as readonly string[]).includes(v);

export type ParsedReportOptions =
  | { ok: true; options: Record<string, unknown> }
  | { ok: false; issues: { path: string; message: string }[] };

/** Validates and defaults `raw` against the kind's option declarations (unknown keys are refused). */
export function parseReportOptions(
  kind: ReportKind,
  raw: unknown
): ParsedReportOptions {
  const defs = REPORT_DEFS[kind].options;
  const issues: { path: string; message: string }[] = [];
  if (raw === undefined || raw === null) raw = {};
  if (typeof raw !== 'object' || Array.isArray(raw))
    return {
      ok: false,
      issues: [{ path: '', message: 'options must be an object' }],
    };
  const input = raw as Record<string, unknown>;
  const known = new Set(defs.map((d) => d.name));
  for (const k of Object.keys(input))
    if (!known.has(k)) issues.push({ path: k, message: 'unknown option' });
  const out: Record<string, unknown> = {};
  for (const d of defs) {
    const v = input[d.name];
    if (v === undefined) {
      if (d.required) issues.push({ path: d.name, message: 'required' });
      else if (d.default !== undefined)
        out[d.name] = Array.isArray(d.default) ? [...d.default] : d.default;
      continue;
    }
    switch (d.type) {
      case 'boolean':
        if (typeof v !== 'boolean')
          issues.push({ path: d.name, message: 'must be a boolean' });
        else out[d.name] = v;
        break;
      case 'number':
        if (
          typeof v !== 'number' ||
          !Number.isFinite(v) ||
          (d.min !== undefined && v < d.min) ||
          (d.max !== undefined && v > d.max)
        ) {
          issues.push({
            path: d.name,
            message: `must be a number${d.min !== undefined ? ` from ${d.min}` : ''}${d.max !== undefined ? ` to ${d.max}` : ''}`,
          });
        } else out[d.name] = v;
        break;
      case 'string':
        if (
          typeof v !== 'string' ||
          (d.required && v.length === 0) ||
          v.length > 500
        )
          issues.push({
            path: d.name,
            message: 'must be a non-empty string of at most 500 characters',
          });
        else out[d.name] = v;
        break;
      case 'enum':
        if (typeof v !== 'string' || !d.values!.includes(v))
          issues.push({
            path: d.name,
            message: `must be one of ${d.values!.join(', ')}`,
          });
        else out[d.name] = v;
        break;
      case 'stringList':
        if (
          !Array.isArray(v) ||
          v.length > 500 ||
          v.some((x) => typeof x !== 'string')
        )
          issues.push({ path: d.name, message: 'must be an array of strings' });
        else out[d.name] = v;
        break;
    }
  }
  return issues.length > 0 ? { ok: false, issues } : { ok: true, options: out };
}

// ─── Requests ───────────────────────────────────────────────────────────────

/** `GET /documents/:did/reports/:kind?source=&options=<json>`. */
export const reportGetQuerySchema = z.object({
  source: sourceParamSchema.optional(),
  options: z.string().max(20_000).optional(),
});
export type ReportGetQuery = z.infer<typeof reportGetQuerySchema>;

/** `POST /documents/:did/reports`. `json` answers the result; the other formats a `report.render` job. */
export const reportCreateSchema = z.object({
  kind: z.enum(REPORT_KINDS),
  source: docSourceSchema.optional(),
  options: z.record(z.string(), z.unknown()).default({}),
  format: z.enum(REPORT_FORMATS).default('json'),
});
export type ReportCreateRequest = z.infer<typeof reportCreateSchema>;

/** The `input` of a `report.render` job (`sources[0]` is the document). */
export const reportRenderInputSchema = z.object({
  kind: z.enum(REPORT_KINDS),
  source: z.string().default('live'),
  options: z.record(z.string(), z.unknown()).default({}),
  format: z.enum(REPORT_FORMATS).default('csv'),
});
export type ReportRenderInput = z.infer<typeof reportRenderInputSchema>;

// ─── Rendering (shared by the API's CSV/HTML/PDF and by any client that wants the same text) ─────────────

export const cellText = (v: ReportCell): string =>
  v === null || v === undefined ? '' : String(v);

const csvField = (s: string) =>
  /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

/** CSV of every table (a title line and a blank line between tables when there is more than one). RFC 4180 quoting, CRLF. */
export function reportToCsv(result: Pick<ReportResult, 'tables'>): string {
  const blocks = result.tables.map((t) => {
    const lines: string[] = [];
    if (result.tables.length > 1 && t.title) lines.push(csvField(t.title));
    lines.push(t.columns.map((c) => csvField(c.label)).join(','));
    for (const r of t.rows)
      lines.push(
        t.columns.map((c) => csvField(cellText(r[c.id] ?? null))).join(',')
      );
    if (t.footer)
      lines.push(
        t.columns
          .map((c) => csvField(cellText(t.footer![c.id] ?? null)))
          .join(',')
      );
    return lines.join('\r\n');
  });
  return blocks.join('\r\n\r\n') + '\r\n';
}

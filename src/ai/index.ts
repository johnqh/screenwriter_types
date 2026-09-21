import { z } from 'zod';

/**
 * AI features (spec 06): script review and polish through ShapeShyft.
 *
 * Only the tasks implemented so far are in `AI_TASKS`; adding one means a registry row in
 * `screenwriter_api/src/services/ai/tasks.ts`, a prompt builder, an output schema here and a fixture.
 * Output schemas are written for structured output: every field is required (nullable, never optional)
 * and objects are closed, so `z.toJSONSchema` gives the exact schema to store on the ShapeShyft endpoint.
 */

export const AI_TASKS = ['coverage', 'polish.dialogue'] as const;
export type AiTask = (typeof AI_TASKS)[number];
export const aiTaskSchema = z.enum(AI_TASKS);

/** ShapeShyft endpoint names (spec 06 2.1). `summarize-chunk` is stage 1 of a long coverage run. */
export const AI_ENDPOINTS = ['coverage-review', 'polish', 'summarize-chunk'] as const;
export type AiEndpoint = (typeof AI_ENDPOINTS)[number];

export const AI_JOB_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'cancelled'] as const;
export type AiJobStatus = (typeof AI_JOB_STATUSES)[number];

/** Counted limits, declared once: schemas, validators and prompt text all read these. */
export const AI_LIMITS = {
  noteTitleMax: 80,
  noteBodyMax: 1200,
  noteAnchorsMax: 8,
  strengthsMax: 8,
  weaknessesMax: 12,
  sceneNotesMax: 20,
  loglineMax: 300,
  summaryMax: 4000,
  genreMax: 3,
  verdictRationaleMax: 800,
  polishSuggestionsMax: 200,
  polishTextMax: 4000,
  rationaleMax: 400,
  chunkSummaryMax: 1200,
  sceneSummaryMax: 280,
  polishMaxScenes: 8,
  instructionsMax: 500,
} as const;

export const REVIEW_CATEGORIES = [
  'premise', 'structure', 'character', 'dialogue', 'pacing', 'tone',
  'theme', 'worldbuilding', 'format', 'marketability', 'clarity', 'continuity',
] as const;
export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number];
export const SEVERITIES = ['praise', 'minor', 'moderate', 'major'] as const;
export type Severity = (typeof SEVERITIES)[number];
export const COVERAGE_VERDICTS = ['recommend', 'consider', 'pass'] as const;

// ---- Model output (untrusted until validated; what the ShapeShyft endpoint returns) ----

/** Where a note points. `elementId: null` means the whole scene. The server adds the content hash. */
export const anchorRefSchema = z.object({
  sceneId: z.string(),
  elementId: z.string().nullable(),
});
export type AnchorRef = z.infer<typeof anchorRefSchema>;

export const noteSchema = z.object({
  category: z.enum(REVIEW_CATEGORIES),
  severity: z.enum(SEVERITIES),
  title: z.string().min(1).max(AI_LIMITS.noteTitleMax),
  body: z.string().min(1).max(AI_LIMITS.noteBodyMax),
  anchors: z.array(anchorRefSchema).max(AI_LIMITS.noteAnchorsMax),
});
export type ModelNote = z.infer<typeof noteSchema>;

/** `coverage-review` output. */
export const coverageResponseSchema = z.object({
  logline: z.string().max(AI_LIMITS.loglineMax),
  summary: z.string().max(AI_LIMITS.summaryMax),
  genre: z.array(z.string()).max(AI_LIMITS.genreMax),
  strengths: z.array(noteSchema).max(AI_LIMITS.strengthsMax),
  weaknesses: z.array(noteSchema).max(AI_LIMITS.weaknessesMax),
  /** Notes about specific scenes: each must anchor at least one scene. */
  sceneNotes: z.array(noteSchema).max(AI_LIMITS.sceneNotesMax),
  verdict: z.enum(COVERAGE_VERDICTS),
  verdictRationale: z.string().max(AI_LIMITS.verdictRationaleMax),
});
export type CoverageResponse = z.infer<typeof coverageResponseSchema>;

/** `polish` output: one proposed replacement per element. */
export const polishResponseSchema = z.object({
  suggestions: z
    .array(
      z.object({
        elementId: z.string(),
        after: z.string().max(AI_LIMITS.polishTextMax),
        rationale: z.string().max(AI_LIMITS.rationaleMax),
      })
    )
    .max(AI_LIMITS.polishSuggestionsMax),
});
export type PolishResponse = z.infer<typeof polishResponseSchema>;

/** `summarize-chunk` output (stage 1 of a long-script coverage run). */
export const chunkSummaryResponseSchema = z.object({
  scenes: z.array(
    z.object({
      sceneId: z.string(),
      summary: z.string().max(AI_LIMITS.sceneSummaryMax),
      intensity: z.number().int().min(1).max(5),
    })
  ),
  chunkSummary: z.string().max(AI_LIMITS.chunkSummaryMax),
});
export type ChunkSummaryResponse = z.infer<typeof chunkSummaryResponseSchema>;

/** The five input fields every endpoint takes (spec 06 2.1). */
export const aiEndpointInputSchema = z.object({
  context: z.string(),
  brief: z.string(),
  max_output_tokens: z.number().int().positive(),
  locale: z.string(),
  script_language: z.string(),
});
export type AiEndpointInput = z.infer<typeof aiEndpointInputSchema>;

/** Endpoint -> output schema. `bun run ai:schemas` in screenwriter_api prints these as JSON Schema. */
export const AI_ENDPOINT_OUTPUT_SCHEMAS = {
  'coverage-review': coverageResponseSchema,
  polish: polishResponseSchema,
  'summarize-chunk': chunkSummaryResponseSchema,
} as const satisfies Record<AiEndpoint, z.ZodType>;

// ---- Stored / returned shapes ----

export interface Anchor {
  sceneId: string;
  elementId?: string;
  /** Content hash (spec 11 4.2) of the element, or of the scene when there is no elementId, at generation time. */
  contentHash: string;
}

export interface AiNote {
  id: string;
  category: ReviewCategory;
  severity: Severity;
  title: string;
  body: string;
  anchors: Anchor[];
}

export interface CoverageReport {
  logline: string;
  summary: string;
  genre: string[];
  verdict: (typeof COVERAGE_VERDICTS)[number];
  verdictRationale: string;
  strengths: AiNote[];
  weaknesses: AiNote[];
  notesByScene: { sceneId: string; heading: string; notes: AiNote[] }[];
  stats: { scenes: number; chunks: number; droppedItems: number };
}

export interface AiTokenUsage {
  promptTokens: number;
  completionTokens: number;
  calls: number;
  model: string | null;
}

// ---- Jobs ----

export const aiScopeSchema = z.object({
  sceneIds: z.array(z.string().min(1)).max(200).optional(),
  elementIds: z.array(z.string().min(1)).max(2000).optional(),
});
export type AiScope = z.infer<typeof aiScopeSchema>;

export const aiJobOptionsSchema = z.object({
  /** Writer's own request, fenced separately from the script. Fixture failure markers only work in test mode. */
  instructions: z.string().max(AI_LIMITS.instructionsMax).optional(),
  intensity: z.enum(['light', 'medium', 'bold']).optional(),
  locale: z.string().min(2).max(20).optional(),
});
export type AiJobOptions = z.infer<typeof aiJobOptionsSchema>;

/** `POST /documents/:did/ai/jobs` body. `polish.dialogue` needs a scope; `coverage` defaults to the whole script. */
export const aiJobCreateSchema = z.object({
  task: aiTaskSchema,
  scope: aiScopeSchema.optional(),
  options: aiJobOptionsSchema.optional(),
});
export type AiJobCreateRequest = z.infer<typeof aiJobCreateSchema>;

/** 202 response. */
export interface AiJobCreated {
  jobId: string;
  status: 'queued';
}

export interface AiJobProgress {
  stage: string;
  done: number;
  total: number;
}

export interface AiJobError {
  code: string;
  message: string;
}

export type AiJobResult =
  | { kind: 'report'; report: CoverageReport }
  /** `suggestionSetId` is null when the model found nothing worth changing (count 0). */
  | { kind: 'suggestions'; suggestionSetId: string | null; count: number; droppedItems: number };

/** `GET /ai/jobs/:jobId` and the items of `GET /documents/:did/ai/jobs`. Poll until `status` is final. */
export interface AiJob {
  id: string;
  documentId: string;
  task: AiTask;
  status: AiJobStatus;
  progress?: AiJobProgress;
  result?: AiJobResult;
  error?: AiJobError;
  promptVersion: string;
  usage?: AiTokenUsage;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

// ---- Suggestion sets (spec 06 7) ----

export const SUGGESTION_STATUSES = ['pending', 'accepted', 'rejected', 'stale'] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];
export const SUGGESTION_SET_STATUSES = [
  'pending', 'partiallyAccepted', 'accepted', 'rejected', 'stale', 'expired',
] as const;
export type SuggestionSetStatus = (typeof SUGGESTION_SET_STATUSES)[number];

export interface Suggestion {
  id: string;
  elementId: string;
  kind: 'replaceText';
  before: string;
  after: string;
  rationale: string;
  /** The element's content hash when the suggestion was generated; accepting checks it. */
  contentHash: string;
  status: SuggestionStatus;
  decidedAt: string | null;
}

export interface SuggestionSetSummary {
  id: string;
  documentId: string;
  jobId: string;
  task: AiTask;
  promptVersion: string;
  status: SuggestionSetStatus;
  sourceEpoch: number;
  counts: Record<SuggestionStatus, number>;
  createdAt: string;
}

export interface SuggestionSet extends SuggestionSetSummary {
  suggestions: Suggestion[];
}

export const suggestionAcceptSchema = z.object({
  suggestionIds: z.array(z.string().min(1)).min(1).max(200),
});
export type SuggestionAcceptRequest = z.infer<typeof suggestionAcceptSchema>;

/** `reject` with no ids rejects every pending suggestion in the set. */
export const suggestionRejectSchema = z.object({
  suggestionIds: z.array(z.string().min(1)).min(1).max(200).optional(),
});
export type SuggestionRejectRequest = z.infer<typeof suggestionRejectSchema>;

export interface SuggestionAcceptResponse {
  applied: string[];
  set: SuggestionSet;
}

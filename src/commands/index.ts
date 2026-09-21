import { z } from 'zod';

/**
 * A writing_core command as plain JSON. The command bodies are typed by
 * writing_core; here they are opaque records until the API validates them.
 */
export type WritingCommandJson = Record<string, unknown>;

export const COMMAND_BATCH_MAX = 500;

export const commandBatchRequestSchema = z.object({
  commands: z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(COMMAND_BATCH_MAX),
  baseEpoch: z.number().int().min(0),
  expectedHashes: z.record(z.string(), z.string()).optional(),
  dryRun: z.boolean().optional(),
});
export type CommandBatchRequest = z.infer<typeof commandBatchRequestSchema>;

export interface CommandWarning {
  index: number;
  code: string;
  message: string;
}

export interface CommandEffects {
  /** Elements the batch created, changed and removed (sorted ids). */
  createdIds: string[];
  changedIds: string[];
  deletedIds: string[];
  /** Fresh content hashes (spec 11 4.2) of every created or changed element. */
  newHashes: Record<string, string>;
}

/**
 * `POST /documents/:did/commands` response (thin B5 version). A `dryRun` returns the same shape
 * with `applied: 0` and `dryRun: true`: the effects the batch WOULD have, nothing changed.
 * `expectedHashes` keys are element or scene ids; a mismatch is 409 `CONTENT_CHANGED` with
 * `details.ids`.
 */
export interface CommandBatchResponse {
  applied: number;
  epoch: number;
  dryRun?: boolean;
  effects: CommandEffects;
  warnings: CommandWarning[];
}

/** `COMMAND_INVALID` (422) `details`. `reason` is a writing_core ReasonCode (or `exception`). */
export interface CommandInvalidDetails {
  index: number;
  reason: string;
  detail?: Record<string, unknown>;
}

// ---- Scene and element reads (spec 05 6.7.1, live document) ----

export const SCENE_BATCH_MAX = 20;
export const ELEMENT_BATCH_MAX = 500;

export interface OutlineScene {
  id: string;
  /** Formatted scene number label, or null when unnumbered. */
  number: string | null;
  heading: string;
  omitted: boolean;
  synopsis: string;
  elementCount: number;
  contentHash: string;
}

export interface OutlineResponse {
  scenes: OutlineScene[];
}

export interface ElementRead {
  id: string;
  styleId: string;
  styleName: string;
  text: string;
  contentHash: string;
}

export interface SceneRead {
  id: string;
  number: string | null;
  heading: string;
  synopsis: string;
  contentHash: string;
  elements: ElementRead[];
}

export const elementsBatchRequestSchema = z.object({
  elementIds: z.array(z.string().min(1)).min(1).max(ELEMENT_BATCH_MAX),
});
export type ElementsBatchRequest = z.infer<typeof elementsBatchRequestSchema>;
export interface ElementsBatchResponse {
  elements: ElementRead[];
}

export const scenesBatchRequestSchema = z.object({
  sceneIds: z.array(z.string().min(1)).min(1).max(SCENE_BATCH_MAX),
});
export type ScenesBatchRequest = z.infer<typeof scenesBatchRequestSchema>;
export interface ScenesBatchResponse {
  scenes: SceneRead[];
}

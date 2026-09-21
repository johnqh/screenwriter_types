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
  changedIds: string[];
  createdIds: string[];
  deletedIds: string[];
  newHashes: Record<string, string>;
  warnings: CommandWarning[];
}

export interface CommandSummary {
  counts?: Record<string, number>;
  affectedSceneIds?: string[];
  pageDelta?: number;
}

export interface CommandBatchResponse {
  applied: number;
  epoch: number;
  /** base64 Yjs state vector */
  stateVector: string;
  effects: CommandEffects;
  summary: CommandSummary;
}

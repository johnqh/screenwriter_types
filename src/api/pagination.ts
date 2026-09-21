import { z } from 'zod';

/** `limit` 1-200 (default 50); `cursor` is an opaque base64url string. */
export const cursorQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
});
export type CursorQuery = z.infer<typeof cursorQuerySchema>;

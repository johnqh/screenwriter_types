import { z } from 'zod';

export const UI_LANGUAGES = [
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'it',
  'ja',
  'zh',
] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number];

/** `GET /me` (spec 05 §6.1). */
export interface Me {
  userId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  locale: string;
  uiLanguage: string;
  timeZone: string;
  siteAdmin: boolean;
  personalWorkspaceId: string;
  createdAt: string;
}

export const meUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  avatarAssetId: z.string().nullable().optional(),
  locale: z.string().min(2).max(35).optional(),
  uiLanguage: z.enum(UI_LANGUAGES).optional(),
  timeZone: z.string().min(1).max(64).optional(),
});
export type MeUpdateRequest = z.infer<typeof meUpdateSchema>;

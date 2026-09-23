import { z } from 'zod';

/**
 * Account and per-user data (slice B13; spec 05 §6.1, §6.1.1, §6.26, §8.1, §17).
 * Everything here belongs to one user: preferences, spelling dictionary, macros, writing sessions, stats, goals, the
 * per-document view state (`my-state`) and stars. All are user-only routes (an API key gets 403 `API_KEY_FORBIDDEN`),
 * except the macro list, which a key may read.
 */

// ─── user preferences (§6.1.1) ────────────────────────────────────────────────

export const USER_PREFERENCES_VERSION = 1;
/** Serialised size cap of `PUT /me/preferences` (`LIMIT_EXCEEDED`). */
export const USER_PREFERENCES_MAX_BYTES = 256 * 1024;
export const AUTOCORRECT_MAX_PAIRS = 5000;
export const RECENT_SEARCHES_MAX = 20;

export const DEVICE_CLASSES = ['phone', 'tablet', 'desktop'] as const;
export type DeviceClass = (typeof DEVICE_CLASSES)[number];

/** A section is an open object: its keys are owned by spec 09/10 features and grow without a types release. */
const section = z.looseObject({});

const appearanceSchema = z.looseObject({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  pageTheme: z
    .enum(['paper', 'night', 'midnight', 'sepia', 'custom'])
    .optional(),
  custom: section.optional(),
  density: z.string().max(40).optional(),
  largeIcons: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
});

const keymapSchema = z.looseObject({
  preset: z.enum(['fadewright', 'finalDraft', 'fadeIn']).optional(),
  overrides: z.record(z.string(), z.string().nullable()).optional(),
  byPlatform: section.optional(),
});

const autocorrectSchema = z.looseObject({
  options: section.optional(),
  pairs: z
    .array(
      z.object({ from: z.string().min(1).max(200), to: z.string().max(200) })
    )
    .max(AUTOCORRECT_MAX_PAIRS)
    .optional(),
});

const languageSchema = z.looseObject({
  scriptDefault: z.string().max(35).optional(),
  installedDictionaries: z.array(z.string().max(35)).max(50).optional(),
  ignoreLists: section.optional(),
  lookups: z
    .array(z.object({ label: z.string().max(80), url: z.string().max(500) }))
    .max(50)
    .optional(),
});

const tableReadSchema = z.looseObject({
  narratorVoiceByLanguage: z.record(z.string(), section).optional(),
  rate: z.number().optional(),
  actors: z
    .array(z.looseObject({ id: z.string(), name: z.string() }))
    .max(200)
    .optional(),
});

/**
 * `UserPreferences`: one JSON document per user, closed at the top level (an unknown top-level key is `VALIDATION`),
 * open inside each section. `version` is `USER_PREFERENCES_VERSION`; a higher version from a newer client is stored as is.
 */
export const userPreferencesSchema = z.strictObject({
  version: z.number().int().min(1).max(1000).default(USER_PREFERENCES_VERSION),
  appearance: appearanceSchema.optional(),
  editor: section.optional(),
  deviceClasses: z
    .strictObject({
      phone: section.optional(),
      tablet: section.optional(),
      desktop: section.optional(),
    })
    .optional(),
  keymap: keymapSchema.optional(),
  autocorrect: autocorrectSchema.optional(),
  language: languageSchema.optional(),
  tableRead: tableReadSchema.optional(),
  toolbar: section.optional(),
  recentSearches: z
    .array(z.string().max(500))
    .max(RECENT_SEARCHES_MAX)
    .optional(),
  revisionColourSets: z.array(section).max(100).optional(),
  offline: section.optional(),
});
export type UserPreferences = z.output<typeof userPreferencesSchema>;
export type UserPreferencesInput = z.input<typeof userPreferencesSchema>;
export const USER_PREFERENCES_KEYS = [
  'version',
  'appearance',
  'editor',
  'deviceClasses',
  'keymap',
  'autocorrect',
  'language',
  'tableRead',
  'toolbar',
  'recentSearches',
  'revisionColourSets',
  'offline',
] as const;

/** `GET /me/preferences` (and `details.current` of a `STALE_WRITE`): the document plus its optimistic-concurrency token. */
export type UserPreferencesResponse = UserPreferences & { updatedAt: string };

/** `PUT /me/preferences`: a whole-document replace; `baseUpdatedAt` is the `updatedAt` of the last GET/PUT. */
export const userPreferencesPutSchema = userPreferencesSchema.extend({
  baseUpdatedAt: z.string().min(1).max(40),
});
export type UserPreferencesPutRequest = z.input<
  typeof userPreferencesPutSchema
>;
export interface UserPreferencesPutResponse {
  updatedAt: string;
}

// ─── dictionary ───────────────────────────────────────────────────────────────

export const DICTIONARY_MAX_WORDS = 50_000;
const dictionaryWord = z.string().trim().min(1).max(100);
export const dictionaryUpdateSchema = z.object({
  add: z.array(dictionaryWord).max(5000).optional(),
  remove: z.array(dictionaryWord).max(5000).optional(),
});
export type DictionaryUpdateRequest = z.infer<typeof dictionaryUpdateSchema>;
export interface DictionaryResponse {
  words: string[];
}
export interface DictionaryUpdateResponse {
  count: number;
}

// ─── macros ───────────────────────────────────────────────────────────────────

export const USER_MACRO_MAX = 500;
export const MACRO_TRIGGER_KINDS = ['shortcut', 'alias'] as const;

const macroOptionFields = {
  smartReplace: z.boolean(),
  confirm: z.boolean(),
  wordOnly: z.boolean(),
  matchCase: z.boolean(),
  activeInStyles: z.array(z.string().max(80)).max(100),
};
/** Create: every option defaulted. */
const macroOptionsSchema = z.object({
  smartReplace: macroOptionFields.smartReplace.default(false),
  confirm: macroOptionFields.confirm.default(false),
  wordOnly: macroOptionFields.wordOnly.default(true),
  matchCase: macroOptionFields.matchCase.default(false),
  activeInStyles: macroOptionFields.activeInStyles.default([]),
});
/** Patch: no defaults (a default would overwrite the stored value of an option the request did not mention). */
const macroOptionsPatchSchema = z.object(macroOptionFields).partial();

export const userMacroSchema = z.object({
  name: z.string().trim().min(1).max(120),
  trigger: z.object({
    kind: z.enum(MACRO_TRIGGER_KINDS),
    value: z.string().trim().min(1).max(80),
  }),
  insertText: z.string().max(10_000),
  setElementStyle: z.string().max(80).nullable().optional(),
  nextElementStyle: z.string().max(80).nullable().optional(),
  options: macroOptionsSchema.prefault({}),
});
export type UserMacroCreateRequest = z.input<typeof userMacroSchema>;

/** `PATCH /me/macros/:mid`: any subset; `options` and `trigger` merge into the stored ones. */
export const userMacroPatchSchema = z.object({
  name: userMacroSchema.shape.name.optional(),
  trigger: z
    .object({
      kind: z.enum(MACRO_TRIGGER_KINDS).optional(),
      value: userMacroSchema.shape.trigger.shape.value.optional(),
    })
    .optional(),
  insertText: userMacroSchema.shape.insertText.optional(),
  setElementStyle: userMacroSchema.shape.setElementStyle,
  nextElementStyle: userMacroSchema.shape.nextElementStyle,
  options: macroOptionsPatchSchema.optional(),
});
export type UserMacroPatchRequest = z.input<typeof userMacroPatchSchema>;

export interface UserMacro {
  id: string;
  name: string;
  trigger: { kind: (typeof MACRO_TRIGGER_KINDS)[number]; value: string };
  insertText: string;
  setElementStyle: string | null;
  nextElementStyle: string | null;
  options: z.output<typeof macroOptionsSchema>;
  createdAt: string;
  updatedAt: string;
}
export interface DeleteResponse {
  deleted: true;
}

// ─── writing sessions, stats, goals ───────────────────────────────────────────

export const WRITING_GOAL_KINDS = [
  'wordsPerDay',
  'pagesPerDay',
  'minutesPerDay',
  'wordsPerWeek',
  'documentTarget',
] as const;
export type WritingGoalKind = (typeof WRITING_GOAL_KINDS)[number];
export const WRITING_GOALS_MAX = 50;
export const WRITING_STATS_GRANULARITIES = [
  'day',
  'week',
  'month',
  'year',
] as const;
export type WritingStatsGranularity =
  (typeof WRITING_STATS_GRANULARITIES)[number];

const isoInstant = z.iso.datetime({ offset: true });

/**
 * `POST /me/writing-sessions`. `clientSessionId` is the row id (`wss_...`, made by the client) and makes the upload
 * idempotent: a repeat is accepted and changes nothing, so a device may retry and may upload offline sessions later.
 */
export const writingSessionSchema = z
  .object({
    clientSessionId: z
      .string()
      .min(8)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/),
    documentId: z.string().min(1).max(100).nullable().optional(),
    startedAt: isoInstant,
    endedAt: isoInstant,
    activeSeconds: z.number().int().min(0).max(86_400),
    wordsAdded: z.number().int().min(0).max(1_000_000),
    wordsRemoved: z.number().int().min(0).max(1_000_000),
    netPagesEighths: z.number().int().min(-100_000).max(100_000),
    sprint: z
      .object({
        targetWords: z.number().int().min(1).max(1_000_000).optional(),
        targetMinutes: z.number().int().min(1).max(1440).optional(),
      })
      .optional(),
  })
  .refine((s) => Date.parse(s.endedAt) >= Date.parse(s.startedAt), {
    message: 'endedAt is before startedAt',
    path: ['endedAt'],
  });
export type WritingSessionRequest = z.input<typeof writingSessionSchema>;
export interface WritingSessionResponse {
  accepted: true;
}

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** `GET /me/writing-stats`: dates are calendar days in the user's time zone (`users.time_zone`). Defaults: the last 30 days by day. */
export const writingStatsQuerySchema = z.object({
  from: localDate.optional(),
  to: localDate.optional(),
  granularity: z.enum(WRITING_STATS_GRANULARITIES).default('day'),
  documentId: z.string().min(1).max(100).optional(),
});
export type WritingStatsQuery = z.input<typeof writingStatsQuerySchema>;

export interface WritingStatsBucket {
  /** `YYYY-MM-DD`: the first day of the day/week (Monday)/month/year, in the user's time zone. */
  start: string;
  wordsAdded: number;
  wordsRemoved: number;
  /** `netPagesEighths / 8`. */
  netPages: number;
  activeSeconds: number;
}
/** A day counts when the user added words on it (over all documents, in their time zone). Today does not break a streak until it ends. */
export interface StreakSummary {
  current: number;
  longest: number;
  /** `YYYY-MM-DD` of the latest day with words, or null. */
  lastActiveDate: string | null;
  activeToday: boolean;
}
export interface WritingStats {
  buckets: WritingStatsBucket[];
  streak: StreakSummary;
}

export const writingGoalInputSchema = z
  .object({
    id: z
      .string()
      .min(4)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    kind: z.enum(WRITING_GOAL_KINDS),
    documentId: z.string().min(1).max(100).nullable().optional(),
    target: z.number().int().min(1).max(10_000_000),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    idleTimeoutSec: z.number().int().min(5).max(3600).optional(),
  })
  .refine((g) => g.kind !== 'documentTarget' || !!g.documentId, {
    message: 'documentTarget needs documentId',
    path: ['documentId'],
  });
/** `PUT /me/writing-goals`: the whole list. A goal missing from it is deleted; one without `id` is created. `daysOfWeek`: 0 = Sunday. */
/** No `.max` here on purpose: more than `WRITING_GOALS_MAX` is 409 `LIMIT_EXCEEDED` from the server, not `VALIDATION`. */
export const writingGoalsPutSchema = z.object({
  goals: z.array(writingGoalInputSchema),
});
export type WritingGoalsPutRequest = z.input<typeof writingGoalsPutSchema>;
export interface WritingGoal {
  id: string;
  kind: WritingGoalKind;
  documentId: string | null;
  target: number;
  daysOfWeek: number[] | null;
  idleTimeoutSec: number | null;
  createdAt: string;
  updatedAt: string;
}

// ─── export, delete, restore ──────────────────────────────────────────────────

export const ACCOUNT_DELETE_CONFIRM = 'DELETE';
export const accountDeleteSchema = z.object({
  confirm: z.literal(ACCOUNT_DELETE_CONFIRM),
});
export type AccountDeleteRequest = z.infer<typeof accountDeleteSchema>;
export interface AccountDeleteResponse {
  deletionScheduledFor: string;
}
export interface AccountRestoreResponse {
  restored: true;
}
/** `account.export` job input: none. The output is `fadewright-export.zip`. */
export const accountExportInputSchema = z.object({}).default({});
export const ACCOUNT_EXPORT_FILENAME = 'fadewright-export.zip';

// ─── per-user document state and stars (§6.26) ────────────────────────────────

export const DOCUMENT_VIEW_STATE_MAX_BYTES = 64 * 1024;

const deviceViewSchema = z.looseObject({
  view: z.string().max(40).optional(),
  zoom: z.number().optional(),
  invisibles: z.boolean().optional(),
  ruler: z.boolean().optional(),
});

/**
 * Cross-device view state of one document for one user: Navigator tabs and columns, split layout, view mode and zoom per
 * device class. Caret, selection, undo history and the Beat Board viewport stay device-local. Every key optional: the
 * client merges per top-level key.
 */
export const documentViewStateSchema = z.strictObject({
  navigator: z
    .looseObject({
      tabs: z.array(z.looseObject({})).max(50).optional(),
      activeTab: z.string().max(80).nullable().optional(),
    })
    .optional(),
  layout: z
    .looseObject({
      split: z.union([z.string().max(40), z.number(), z.null()]).optional(),
      panes: z.array(z.unknown()).max(20).optional(),
    })
    .optional(),
  views: z
    .strictObject({
      phone: deviceViewSchema.optional(),
      tablet: deviceViewSchema.optional(),
      desktop: deviceViewSchema.optional(),
    })
    .optional(),
});
export type DocumentViewState = z.output<typeof documentViewStateSchema>;

/** `GET /documents/:did/my-state`: `{}` until first saved, then the state plus `updatedAt`. */
export type DocumentViewStateResponse = DocumentViewState & {
  updatedAt?: string;
};

/** `PUT`: the whole state; `baseUpdatedAt` is the `updatedAt` last read (null or absent when the GET returned `{}`). */
export const documentViewStatePutSchema = documentViewStateSchema.extend({
  baseUpdatedAt: z.string().min(1).max(40).nullable().optional(),
});
export type DocumentViewStatePutRequest = z.input<
  typeof documentViewStatePutSchema
>;
export interface DocumentViewStatePutResponse {
  updatedAt: string;
}

export interface StarResponse {
  starred: boolean;
}

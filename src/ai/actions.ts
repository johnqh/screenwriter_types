import { z } from 'zod';

/**
 * Synchronous AI actions: `POST /ai/{action}` in screenwriter_api, which authenticates the caller and turns around
 * to one ShapeShyft endpoint of the same name. Unlike the document jobs in `./index.ts` (coverage, polish) these take
 * their whole input in the request body, read no document, and answer in the same HTTP response.
 *
 * The output schemas follow the same convention as `AI_ENDPOINT_OUTPUT_SCHEMAS`: written for structured output, so
 * every field is required (nullable, never optional) and objects are closed — `z.toJSONSchema` gives the exact schema
 * to store on the ShapeShyft endpoint (`bun run ai:schemas` in screenwriter_api prints them). What the API returns to
 * the client is the normalised `*Result` shape (nulls dropped), not the raw model shape.
 */

export const AI_ACTIONS = [
  'generate-character-skeleton',
  'generate-script',
  'polish-character-dialogue',
  'polish-scene',
  'smart-paste-characters',
  'smart-paste-plots',
  'smart-paste-script',
  'suggest-note-fix',
] as const;
export type AiAction = (typeof AI_ACTIONS)[number];
export const aiActionSchema = z.enum(AI_ACTIONS);

/** Counted limits for the action requests, declared once: request schemas, output schemas and prompts read these. */
export const AI_ACTION_LIMITS = {
  /** Free-form text a writer pastes in: a character description, or the story to turn into a script. */
  descriptionMax: 8_000,
  storyMax: 30_000,
  skeletonFieldMax: 1_000,
  characterNameMax: 80,
  languageMax: 35,
  /** Dialogue polish: one character's lines. */
  dialoguesMax: 100,
  dialogueTextMax: 2_000,
  /** Scene polish. */
  sceneElementsMax: 300,
  sceneElementTextMax: 2_000,
  sceneCharactersMax: 20,
  /** Script generation output. */
  scenesMax: 40,
  elementsPerSceneMax: 200,
  elementTextMax: 2_000,
  titleMax: 120,
  locationMax: 120,
  timeMax: 40,
  idMax: 64,
  /**
   * Smart Paste: text taken from the clipboard. Counted in words (what the writer sees and what is priced) and in
   * characters (a hard ceiling for the request body). The script limit is lower because its output is as long as
   * its input.
   */
  pasteWordsMax: 20_000,
  pasteCharsMax: 160_000,
  pasteScriptWordsMax: 8_000,
  pasteScriptCharsMax: 64_000,
  pasteCharactersMax: 40,
  pasteStagesMax: 8,
  pasteAliasesMax: 10,
  pasteKnownNamesMax: 200,
  pasteSubplotsMax: 20,
  plotNameMax: 120,
  plotTextMax: 4_000,
  pasteScenesMax: 120,
  headingTextMax: 200,
  /** Fixes for a review note. */
  noteTitleMax: 200,
  noteBodyMax: 2_000,
  fixSuggestionsMax: 3,
  fixEditsMax: 12,
  fixSummaryMax: 300,
} as const;

// ---- Character skeleton (the shape `screenwriter_app`'s CharacterSkeletonEditor edits) ----

/** Physical, Social, Psychological — the bone structure. Only `age` is required; every other field is optional. */
export const CHARACTER_SKELETON_FIELDS = {
  physical: [
    'age',
    'race',
    'height',
    'weight',
    'appearance',
    'sexOrientationExperience',
    'posture',
    'unusualCharacteristics',
    'health',
  ],
  social: [
    'occupationAndAttitude',
    'education',
    'money',
    'class',
    'relationships',
    'homeLife',
    'religion',
    'placeInCommunity',
    'politics',
    'interests',
  ],
  psychological: [
    'attitudeTowardLife',
    'moralStandard',
    'intelligence',
    'ambitions',
    'frustrations',
    'fearsAndObsessions',
    'extrovertOrIntrovert',
    'specialQualities',
    'proudestAchievement',
    'greatestSorrow',
    'greatestShame',
    'noticedFirst',
    'secret',
    'noticedLast',
    'coreContradictions',
    'deepestDesire',
  ],
} as const;

export const CHARACTER_SKELETON_KEYS = [
  ...CHARACTER_SKELETON_FIELDS.physical,
  ...CHARACTER_SKELETON_FIELDS.social,
  ...CHARACTER_SKELETON_FIELDS.psychological,
] as const;
export type CharacterSkeletonKey = (typeof CHARACTER_SKELETON_KEYS)[number];

const skeletonText = z.string().max(AI_ACTION_LIMITS.skeletonFieldMax);

/** A skeleton as it is stored and sent between client and API: `age` plus whichever other fields have a value. */
export const characterSkeletonSchema = z.object({
  age: skeletonText.min(1),
  ...Object.fromEntries(
    CHARACTER_SKELETON_KEYS.filter((k) => k !== 'age').map((k) => [
      k,
      skeletonText.optional(),
    ])
  ),
} as { age: z.ZodString } & Record<
  Exclude<CharacterSkeletonKey, 'age'>,
  z.ZodOptional<z.ZodString>
>);
export type CharacterSkeleton = z.infer<typeof characterSkeletonSchema>;

/** The model-facing shape: every field required, `null` = the text does not say. */
const characterSkeletonModelSchema = z.strictObject({
  age: skeletonText.min(1),
  ...Object.fromEntries(
    CHARACTER_SKELETON_KEYS.filter((k) => k !== 'age').map((k) => [
      k,
      skeletonText.nullable(),
    ])
  ),
} as { age: z.ZodString } & Record<
  Exclude<CharacterSkeletonKey, 'age'>,
  z.ZodNullable<z.ZodString>
>);

// ---- Script elements (the editor's element styles, minus the scene heading which is structured) ----

export const SCRIPT_ELEMENT_TYPES = [
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'transition',
] as const;
export type ScriptElementType = (typeof SCRIPT_ELEMENT_TYPES)[number];

export const scriptElementSchema = z.strictObject({
  type: z.enum(SCRIPT_ELEMENT_TYPES),
  text: z.string().min(1).max(AI_ACTION_LIMITS.elementTextMax),
});
export type ScriptElement = z.infer<typeof scriptElementSchema>;

export const SCENE_SETTINGS = ['int', 'ext', 'intExt'] as const;
export const sceneHeadingSchema = z.strictObject({
  setting: z.enum(SCENE_SETTINGS),
  location: z.string().min(1).max(AI_ACTION_LIMITS.locationMax),
  /** "DAY", "NIGHT", "LATER" … as it would follow the dash in a heading. */
  time: z.string().min(1).max(AI_ACTION_LIMITS.timeMax),
});
export type SceneHeading = z.infer<typeof sceneHeadingSchema>;

export const generatedSceneSchema = z.strictObject({
  heading: sceneHeadingSchema,
  elements: z
    .array(scriptElementSchema)
    .min(1)
    .max(AI_ACTION_LIMITS.elementsPerSceneMax),
});
export type GeneratedScene = z.infer<typeof generatedSceneSchema>;

// ---- 1. generate-character-skeleton ----

export const generateCharacterSkeletonRequestSchema = z.strictObject({
  /** A free-form paragraph describing the character. */
  text: z.string().trim().min(1).max(AI_ACTION_LIMITS.descriptionMax),
  /** BCP 47 tag the skeleton values are written in. Default: the language of `text`. */
  language: z.string().max(AI_ACTION_LIMITS.languageMax).optional(),
});
export type GenerateCharacterSkeletonRequest = z.infer<
  typeof generateCharacterSkeletonRequestSchema
>;

export const generateCharacterSkeletonModelSchema = z.strictObject({
  skeleton: characterSkeletonModelSchema,
});
export const generateCharacterSkeletonResultSchema = z.strictObject({
  skeleton: characterSkeletonSchema,
});
export type GenerateCharacterSkeletonResult = z.infer<
  typeof generateCharacterSkeletonResultSchema
>;

// ---- 2. generate-script ----

export const generateScriptRequestSchema = z.strictObject({
  /** The story in common language: a premise, a synopsis or a full retelling. */
  story: z.string().trim().min(1).max(AI_ACTION_LIMITS.storyMax),
  title: z.string().trim().max(AI_ACTION_LIMITS.titleMax).optional(),
  /** BCP 47 tag the script is written in. Default: the language of `story`. */
  language: z.string().max(AI_ACTION_LIMITS.languageMax).optional(),
});
export type GenerateScriptRequest = z.infer<typeof generateScriptRequestSchema>;

export const generateScriptModelSchema = z.strictObject({
  title: z.string().max(AI_ACTION_LIMITS.titleMax).nullable(),
  scenes: z.array(generatedSceneSchema).min(1).max(AI_ACTION_LIMITS.scenesMax),
});
export const generateScriptResultSchema = generateScriptModelSchema;
export type GenerateScriptResult = z.infer<typeof generateScriptResultSchema>;

// ---- 3. polish-character-dialogue ----

export const dialogueLineSchema = z.strictObject({
  /** The caller's own id for the line, echoed back so the result maps onto it. */
  id: z.string().min(1).max(AI_ACTION_LIMITS.idMax),
  text: z.string().min(1).max(AI_ACTION_LIMITS.dialogueTextMax),
});
export type DialogueLine = z.infer<typeof dialogueLineSchema>;

export const polishCharacterDialogueRequestSchema = z.strictObject({
  character: z.string().trim().min(1).max(AI_ACTION_LIMITS.characterNameMax),
  skeleton: characterSkeletonSchema,
  /** One character's lines, in script order. */
  dialogues: z
    .array(dialogueLineSchema)
    .min(1)
    .max(AI_ACTION_LIMITS.dialoguesMax),
  /** How much to change; default `medium`. */
  intensity: z.enum(['light', 'medium', 'bold']).optional(),
  language: z.string().max(AI_ACTION_LIMITS.languageMax).optional(),
});
export type PolishCharacterDialogueRequest = z.infer<
  typeof polishCharacterDialogueRequestSchema
>;

export const polishCharacterDialogueModelSchema = z.strictObject({
  /** The same ids in the same order, each with the polished line. */
  dialogues: z
    .array(dialogueLineSchema)
    .min(1)
    .max(AI_ACTION_LIMITS.dialoguesMax),
});
export const polishCharacterDialogueResultSchema =
  polishCharacterDialogueModelSchema;
export type PolishCharacterDialogueResult = z.infer<
  typeof polishCharacterDialogueResultSchema
>;

// ---- 4. polish-scene ----

export const sceneCharacterSchema = z.strictObject({
  /** The name as it appears in the script's character cues. */
  name: z.string().trim().min(1).max(AI_ACTION_LIMITS.characterNameMax),
  skeleton: characterSkeletonSchema,
});
export type SceneCharacter = z.infer<typeof sceneCharacterSchema>;

export const polishSceneRequestSchema = z.strictObject({
  scene: z.strictObject({
    /** The scene heading as text, e.g. "INT. LAB - DAY". Context only: it is not rewritten. */
    heading: z
      .string()
      .max(AI_ACTION_LIMITS.locationMax + AI_ACTION_LIMITS.timeMax + 16)
      .optional(),
    elements: z
      .array(scriptElementSchema)
      .min(1)
      .max(AI_ACTION_LIMITS.sceneElementsMax),
  }),
  /** A skeleton for every character involved in the scene. */
  characters: z
    .array(sceneCharacterSchema)
    .min(1)
    .max(AI_ACTION_LIMITS.sceneCharactersMax),
  intensity: z.enum(['light', 'medium', 'bold']).optional(),
  language: z.string().max(AI_ACTION_LIMITS.languageMax).optional(),
});
export type PolishSceneRequest = z.infer<typeof polishSceneRequestSchema>;

/** The scene may be freely rewritten, so the result is a fresh element list rather than a per-id mapping. */
export const polishSceneModelSchema = z.strictObject({
  elements: z
    .array(scriptElementSchema)
    .min(1)
    .max(AI_ACTION_LIMITS.sceneElementsMax),
});
export const polishSceneResultSchema = polishSceneModelSchema;
export type PolishSceneResult = z.infer<typeof polishSceneResultSchema>;

// ---- Smart Paste: text from the clipboard -> characters, plots, or a formatted script ----

/** Words as the limits and the prices count them: runs of non-whitespace. */
export const countWords = (text: string): number => {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
};

const pastedText = (wordsMax: number, charsMax: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(charsMax)
    .refine((t) => countWords(t) <= wordsMax, {
      message: `Too long: at most ${wordsMax} words`,
    });

// ---- 5. smart-paste-characters ----

export const smartPasteCharactersRequestSchema = z.strictObject({
  /** The pasted text: character notes, a bible, a treatment, or a script the characters appear in. */
  text: pastedText(
    AI_ACTION_LIMITS.pasteWordsMax,
    AI_ACTION_LIMITS.pasteCharsMax
  ),
  /** Names of the characters the document already has, so the same person comes back under the same name. */
  knownNames: z
    .array(z.string().trim().min(1).max(AI_ACTION_LIMITS.characterNameMax))
    .max(AI_ACTION_LIMITS.pasteKnownNamesMax)
    .optional(),
  language: z.string().max(AI_ACTION_LIMITS.languageMax).optional(),
});
export type SmartPasteCharactersRequest = z.infer<
  typeof smartPasteCharactersRequestSchema
>;

const pastedCharacterName = z
  .string()
  .min(1)
  .max(AI_ACTION_LIMITS.characterNameMax);

export const smartPasteCharactersModelSchema = z.strictObject({
  characters: z
    .array(
      z.strictObject({
        name: pastedCharacterName,
        /** Other names the text uses for the same person (nicknames, a title, a maiden name). */
        aliases: z
          .array(pastedCharacterName)
          .max(AI_ACTION_LIMITS.pasteAliasesMax),
        /** One skeleton per age the text describes the character at; usually exactly one. Youngest first. */
        stages: z
          .array(characterSkeletonModelSchema)
          .min(1)
          .max(AI_ACTION_LIMITS.pasteStagesMax),
      })
    )
    .max(AI_ACTION_LIMITS.pasteCharactersMax),
});

export const pastedCharacterSchema = z.strictObject({
  name: pastedCharacterName,
  aliases: z.array(pastedCharacterName).max(AI_ACTION_LIMITS.pasteAliasesMax),
  stages: z
    .array(characterSkeletonSchema)
    .min(1)
    .max(AI_ACTION_LIMITS.pasteStagesMax),
});
export type PastedCharacter = z.infer<typeof pastedCharacterSchema>;
export const smartPasteCharactersResultSchema = z.strictObject({
  /** Empty when the text describes nobody. */
  characters: z
    .array(pastedCharacterSchema)
    .max(AI_ACTION_LIMITS.pasteCharactersMax),
});
export type SmartPasteCharactersResult = z.infer<
  typeof smartPasteCharactersResultSchema
>;

// ---- 6. smart-paste-plots ----

export const smartPastePlotsRequestSchema = z.strictObject({
  text: pastedText(
    AI_ACTION_LIMITS.pasteWordsMax,
    AI_ACTION_LIMITS.pasteCharsMax
  ),
  language: z.string().max(AI_ACTION_LIMITS.languageMax).optional(),
});
export type SmartPastePlotsRequest = z.infer<
  typeof smartPastePlotsRequestSchema
>;

export const pastedSubplotSchema = z.strictObject({
  name: z.string().min(1).max(AI_ACTION_LIMITS.plotNameMax),
  text: z.string().min(1).max(AI_ACTION_LIMITS.plotTextMax),
});
export type PastedSubplot = z.infer<typeof pastedSubplotSchema>;

export const smartPastePlotsModelSchema = z.strictObject({
  /** The main plot; null when the text has none. */
  mainPlot: z.string().max(AI_ACTION_LIMITS.plotTextMax).nullable(),
  subplots: z.array(pastedSubplotSchema).max(AI_ACTION_LIMITS.pasteSubplotsMax),
});
export const smartPastePlotsResultSchema = z.strictObject({
  mainPlot: z.string().min(1).max(AI_ACTION_LIMITS.plotTextMax).optional(),
  subplots: z.array(pastedSubplotSchema).max(AI_ACTION_LIMITS.pasteSubplotsMax),
});
export type SmartPastePlotsResult = z.infer<typeof smartPastePlotsResultSchema>;

// ---- 7. smart-paste-script ----

/** Formats the pasted text as a script, keeping the writer's words. The text stays in its own language. */
export const smartPasteScriptRequestSchema = z.strictObject({
  text: pastedText(
    AI_ACTION_LIMITS.pasteScriptWordsMax,
    AI_ACTION_LIMITS.pasteScriptCharsMax
  ),
});
export type SmartPasteScriptRequest = z.infer<
  typeof smartPasteScriptRequestSchema
>;

export const pastedSceneSchema = z.strictObject({
  /**
   * The scene heading as the writer wrote it ("INT. LAB - DAY"). Null only for text that comes before the first
   * heading (a paste that starts in the middle of a scene).
   */
  heading: z.string().min(1).max(AI_ACTION_LIMITS.headingTextMax).nullable(),
  elements: z
    .array(scriptElementSchema)
    .max(AI_ACTION_LIMITS.elementsPerSceneMax),
});
export type PastedScene = z.infer<typeof pastedSceneSchema>;

export const smartPasteScriptModelSchema = z.strictObject({
  scenes: z
    .array(pastedSceneSchema)
    .min(1)
    .max(AI_ACTION_LIMITS.pasteScenesMax),
});
export const smartPasteScriptResultSchema = smartPasteScriptModelSchema;
export type SmartPasteScriptResult = z.infer<
  typeof smartPasteScriptResultSchema
>;

// ---- 8. suggest-note-fix ----

/** One element of the scene a note is about, with the caller's id so an edit can name it. */
export const fixSceneElementSchema = z.strictObject({
  id: z.string().min(1).max(AI_ACTION_LIMITS.idMax),
  type: z.enum(SCRIPT_ELEMENT_TYPES),
  text: z.string().min(1).max(AI_ACTION_LIMITS.sceneElementTextMax),
});
export type FixSceneElement = z.infer<typeof fixSceneElementSchema>;

export const suggestNoteFixRequestSchema = z.strictObject({
  /** The review note to act on, as the review gave it. */
  note: z.strictObject({
    title: z.string().trim().min(1).max(AI_ACTION_LIMITS.noteTitleMax),
    body: z.string().trim().min(1).max(AI_ACTION_LIMITS.noteBodyMax),
    category: z.string().max(40).optional(),
  }),
  scene: z.strictObject({
    heading: z.string().max(AI_ACTION_LIMITS.headingTextMax).optional(),
    elements: z
      .array(fixSceneElementSchema)
      .min(1)
      .max(AI_ACTION_LIMITS.sceneElementsMax),
  }),
  /** Ids of the elements the note points at, when it points at particular ones. */
  focusIds: z
    .array(z.string().min(1).max(AI_ACTION_LIMITS.idMax))
    .max(AI_ACTION_LIMITS.sceneElementsMax)
    .optional(),
  language: z.string().max(AI_ACTION_LIMITS.languageMax).optional(),
});
export type SuggestNoteFixRequest = z.infer<typeof suggestNoteFixRequestSchema>;

export const noteFixEditSchema = z.strictObject({
  /** The id of an element that was sent. */
  id: z.string().min(1).max(AI_ACTION_LIMITS.idMax),
  /** The element's new text; null removes the element. */
  text: z.string().max(AI_ACTION_LIMITS.sceneElementTextMax).nullable(),
});
export type NoteFixEdit = z.infer<typeof noteFixEditSchema>;

export const noteFixSuggestionSchema = z.strictObject({
  /** What this fix does, in one or two sentences, for the writer choosing between fixes. */
  summary: z.string().min(1).max(AI_ACTION_LIMITS.fixSummaryMax),
  edits: z.array(noteFixEditSchema).min(1).max(AI_ACTION_LIMITS.fixEditsMax),
});
export type NoteFixSuggestion = z.infer<typeof noteFixSuggestionSchema>;

export const suggestNoteFixModelSchema = z.strictObject({
  /** Different ways to fix the note, best first. Empty when the note cannot be fixed by editing this scene's text. */
  suggestions: z
    .array(noteFixSuggestionSchema)
    .max(AI_ACTION_LIMITS.fixSuggestionsMax),
});
export const suggestNoteFixResultSchema = suggestNoteFixModelSchema;
export type SuggestNoteFixResult = z.infer<typeof suggestNoteFixResultSchema>;

// ---- Registry ----

/** Action -> schema of what the model returns (stored on the ShapeShyft endpoint). */
export const AI_ACTION_MODEL_SCHEMAS = {
  'generate-character-skeleton': generateCharacterSkeletonModelSchema,
  'generate-script': generateScriptModelSchema,
  'polish-character-dialogue': polishCharacterDialogueModelSchema,
  'polish-scene': polishSceneModelSchema,
  'smart-paste-characters': smartPasteCharactersModelSchema,
  'smart-paste-plots': smartPastePlotsModelSchema,
  'smart-paste-script': smartPasteScriptModelSchema,
  'suggest-note-fix': suggestNoteFixModelSchema,
} as const satisfies Record<AiAction, z.ZodType>;

/** Action -> schema of the request body the client sends. */
export const AI_ACTION_REQUEST_SCHEMAS = {
  'generate-character-skeleton': generateCharacterSkeletonRequestSchema,
  'generate-script': generateScriptRequestSchema,
  'polish-character-dialogue': polishCharacterDialogueRequestSchema,
  'polish-scene': polishSceneRequestSchema,
  'smart-paste-characters': smartPasteCharactersRequestSchema,
  'smart-paste-plots': smartPastePlotsRequestSchema,
  'smart-paste-script': smartPasteScriptRequestSchema,
  'suggest-note-fix': suggestNoteFixRequestSchema,
} as const satisfies Record<AiAction, z.ZodType>;

/** What `POST /ai/{action}` returns in `data`: the normalised result plus what the call cost. */
export interface AiActionUsage {
  /** Credits charged (0 for a site admin). */
  credits: number;
  promptTokens: number;
  completionTokens: number;
}
export interface AiActionResponse<R> {
  result: R;
  usage: AiActionUsage;
}

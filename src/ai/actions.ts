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

// ---- Registry ----

/** Action -> schema of what the model returns (stored on the ShapeShyft endpoint). */
export const AI_ACTION_MODEL_SCHEMAS = {
  'generate-character-skeleton': generateCharacterSkeletonModelSchema,
  'generate-script': generateScriptModelSchema,
  'polish-character-dialogue': polishCharacterDialogueModelSchema,
  'polish-scene': polishSceneModelSchema,
} as const satisfies Record<AiAction, z.ZodType>;

/** Action -> schema of the request body the client sends. */
export const AI_ACTION_REQUEST_SCHEMAS = {
  'generate-character-skeleton': generateCharacterSkeletonRequestSchema,
  'generate-script': generateScriptRequestSchema,
  'polish-character-dialogue': polishCharacterDialogueRequestSchema,
  'polish-scene': polishSceneRequestSchema,
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

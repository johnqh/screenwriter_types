import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  AI_ACTIONS,
  AI_ACTION_MODEL_SCHEMAS,
  AI_ACTION_REQUEST_SCHEMAS,
  API_ROUTES,
  CHARACTER_SKELETON_KEYS,
  characterSkeletonSchema,
  generateCharacterSkeletonModelSchema,
  generateScriptRequestSchema,
  polishCharacterDialogueRequestSchema,
  polishSceneRequestSchema,
} from '../index.js';

describe('ai action types', () => {
  it('has a request schema, a model schema and a route for every action', () => {
    for (const a of AI_ACTIONS) {
      expect(AI_ACTION_REQUEST_SCHEMAS[a]).toBeDefined();
      expect(AI_ACTION_MODEL_SCHEMAS[a]).toBeDefined();
      expect(Object.values(API_ROUTES).some((r) => r.path === `/ai/${a}`)).toBe(
        true
      );
    }
  });

  it('a skeleton needs only an age; every other field is optional text', () => {
    expect(characterSkeletonSchema.safeParse({ age: '50' }).success).toBe(true);
    expect(
      characterSkeletonSchema.safeParse({ age: '50', secret: 'x', race: 'y' })
        .success
    ).toBe(true);
    expect(characterSkeletonSchema.safeParse({ race: 'y' }).success).toBe(
      false
    );
    expect(characterSkeletonSchema.safeParse({ age: '' }).success).toBe(false);
    expect(CHARACTER_SKELETON_KEYS).toHaveLength(
      new Set(CHARACTER_SKELETON_KEYS).size
    );
  });

  it('model schemas are closed and structured-output shaped: every skeleton field required, all but age nullable', () => {
    const js = z.toJSONSchema(
      generateCharacterSkeletonModelSchema
    ) as unknown as {
      properties: {
        skeleton: {
          properties: Record<string, unknown>;
          required: string[];
          additionalProperties: boolean;
        };
      };
    };
    const sk = js.properties.skeleton;
    expect(sk.additionalProperties).toBe(false);
    expect(sk.required).toHaveLength(CHARACTER_SKELETON_KEYS.length);
    expect(Object.keys(sk.properties)).toHaveLength(
      CHARACTER_SKELETON_KEYS.length
    );
    for (const a of AI_ACTIONS)
      expect(() => z.toJSONSchema(AI_ACTION_MODEL_SCHEMAS[a])).not.toThrow();
  });

  it('validates the four request bodies', () => {
    expect(
      generateScriptRequestSchema.safeParse({
        story: 'A lighthouse keeper finds a door.',
      }).success
    ).toBe(true);
    expect(
      generateScriptRequestSchema.safeParse({ story: '   ' }).success
    ).toBe(false);
    expect(
      generateScriptRequestSchema.safeParse({ story: 'x', extra: 1 }).success
    ).toBe(false);
    expect(
      polishCharacterDialogueRequestSchema.safeParse({
        character: 'VOSS',
        skeleton: { age: '50' },
        dialogues: [{ id: 'a', text: 'It should not be running.' }],
      }).success
    ).toBe(true);
    expect(
      polishCharacterDialogueRequestSchema.safeParse({
        character: 'VOSS',
        skeleton: { age: '50' },
        dialogues: [],
      }).success
    ).toBe(false);
    expect(
      polishSceneRequestSchema.safeParse({
        scene: {
          heading: 'INT. LAB - DAY',
          elements: [{ type: 'dialogue', text: 'Hi.' }],
        },
        characters: [{ name: 'VOSS', skeleton: { age: '50' } }],
      }).success
    ).toBe(true);
    expect(
      polishSceneRequestSchema.safeParse({
        scene: { elements: [] },
        characters: [],
      }).success
    ).toBe(false);
  });
});

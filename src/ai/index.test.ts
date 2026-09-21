import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  AI_ENDPOINTS,
  AI_ENDPOINT_OUTPUT_SCHEMAS,
  AI_LIMITS,
  AI_TASKS,
  API_ERROR_CODES,
  API_ROUTES,
  ERROR_STATUS,
  aiJobCreateSchema,
  coverageResponseSchema,
  polishResponseSchema,
  suggestionAcceptSchema,
} from '../index.js';

describe('ai types', () => {
  it('validates job requests and the closed task vocabulary', () => {
    expect(aiJobCreateSchema.safeParse({ task: 'coverage' }).success).toBe(true);
    expect(
      aiJobCreateSchema.safeParse({
        task: 'polish.dialogue',
        scope: { sceneIds: ['el_x'] },
        options: { intensity: 'light', instructions: 'shorter' },
      }).success
    ).toBe(true);
    expect(aiJobCreateSchema.safeParse({ task: 'nope' }).success).toBe(false);
    expect(aiJobCreateSchema.safeParse({ task: 'coverage', options: { instructions: 'x'.repeat(AI_LIMITS.instructionsMax + 1) } }).success).toBe(false);
    expect(suggestionAcceptSchema.safeParse({ suggestionIds: [] }).success).toBe(false);
    expect(AI_TASKS).toEqual(['coverage', 'polish.dialogue']);
  });

  it('every endpoint has an output schema that converts to a closed JSON Schema', () => {
    for (const e of AI_ENDPOINTS) {
      const js = z.toJSONSchema(AI_ENDPOINT_OUTPUT_SCHEMAS[e]) as { type: string; additionalProperties?: boolean; required?: string[] };
      expect(js.type).toBe('object');
      expect(js.additionalProperties).toBe(false);
      expect((js.required ?? []).length).toBeGreaterThan(0);
    }
  });

  it('output schemas reject the near-misses the API validators must repair or drop', () => {
    const note = { category: 'structure', severity: 'praise', title: 't', body: 'b', anchors: [{ sceneId: 'el_a', elementId: null }] };
    const ok = { logline: 'l', summary: 's', genre: [], strengths: [note], weaknesses: [], sceneNotes: [], verdict: 'consider', verdictRationale: 'r' };
    expect(coverageResponseSchema.safeParse(ok).success).toBe(true);
    expect(coverageResponseSchema.safeParse({ ...ok, verdict: 'Consider' }).success).toBe(false);
    expect(coverageResponseSchema.safeParse({ ...ok, strengths: Array(AI_LIMITS.strengthsMax + 1).fill(note) }).success).toBe(false);
    expect(polishResponseSchema.safeParse({ suggestions: [{ elementId: 'el_a', after: 'x', rationale: 'r' }] }).success).toBe(true);
    expect(polishResponseSchema.safeParse({ suggestions: [{ elementId: 7 }] }).success).toBe(false);
  });

  it('registers the AI routes and error codes', () => {
    expect(API_ROUTES.aiJobCreate).toMatchObject({ method: 'POST', path: '/documents/:did/ai/jobs' });
    expect(API_ROUTES.aiSuggestionSetAccept.path).toBe('/ai/suggestion-sets/:ssid/accept');
    for (const c of ['AI_KEY_NOT_PERMITTED', 'AI_OUTPUT_INVALID', 'AI_UNAVAILABLE', 'JOB_ALREADY_RUNNING', 'RATE_LIMITED', 'CONTENT_CHANGED', 'SUGGESTION_UNAVAILABLE'] as const) {
      expect(API_ERROR_CODES[c]).toBe(c);
    }
    expect(ERROR_STATUS.SUGGESTION_UNAVAILABLE).toBe(409);
  });
});

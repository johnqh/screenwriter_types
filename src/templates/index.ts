import type { TemplateCategory } from '@sudobility/writing_core';

export type TemplateScope = 'builtin' | 'user' | 'workspace';

/** `GET /templates` item (spec 05 §6.8). The full body is writing_core's Template. */
export interface TemplateSummary {
  id: string;
  scope: TemplateScope;
  builtinKey: string | null;
  name: string;
  description: string | null;
  category: TemplateCategory;
  latestVersion: number;
}

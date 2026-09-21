import { z } from 'zod';

export const WORKSPACE_KINDS = ['personal', 'team'] as const;
export type WorkspaceKind = (typeof WORKSPACE_KINDS)[number];

/** Ordered by authority. Only `owner` is exercised until sharing ships. */
export const ROLES = [
  'owner',
  'admin',
  'writer',
  'commenter',
  'viewer',
] as const;
export type Role = (typeof ROLES)[number];

export const workspaceKindSchema = z.enum(WORKSPACE_KINDS);
export const roleSchema = z.enum(ROLES);

export interface WorkspaceSummary {
  id: string;
  kind: WorkspaceKind;
  name: string;
  avatarAssetId: string | null;
}

export interface Workspace extends WorkspaceSummary {
  defaultTemplateId: string | null;
  defaultLanguage: string;
  aiEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** `GET /workspaces` item: summary plus the caller's role. */
export type WorkspaceListItem = WorkspaceSummary & { role: Role };

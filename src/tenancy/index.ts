import { z } from 'zod';

export const ENTITY_KINDS = ['personal', 'team'] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

/** Ordered by authority (spec 05 §5.2). */
export const ROLES = [
  'owner',
  'admin',
  'writer',
  'commenter',
  'viewer',
] as const;
export type Role = (typeof ROLES)[number];

export const entityKindSchema = z.enum(ENTITY_KINDS);
export const roleSchema = z.enum(ROLES);

export interface ManagedEntitySummary {
  id: string;
  kind: EntityKind;
  name: string;
  avatarAssetId: string | null;
}

export interface ManagedEntity extends ManagedEntitySummary {
  defaultTemplateId: string | null;
  defaultLanguage: string;
  aiEnabled: boolean;
  /** F-SET-009: false disables every existing `anyone with the link` share link of the workspace and refuses new ones. */
  allowPublicLinks: boolean;
  createdAt: string;
  updatedAt: string;
}

/** `GET /entities` item: summary plus the caller's role. */
export type ManagedEntityListItem = ManagedEntitySummary & { role: Role };

/** `GET /entities/:wid` */
export type ManagedEntityDetail = ManagedEntity & {
  role: Role;
  memberCount: number;
  storageBytes: number;
};

// ─── Permissions (spec 05 §5.2) ─────────────────────────────────────────────

/**
 * Every permission with the LOWEST role that holds it. The matrix is monotonic (a higher role has
 * everything a lower one has), so `ROLE_PERMISSIONS` is derived from this table.
 * Notes on the two permissions with a condition beyond the role:
 *  - `share.manage` for a writer only applies to documents/projects they created (checked by the API).
 *  - `project.trash` / `project.restore` for a writer only applies to projects they created.
 */
export const PERMISSION_MIN_ROLE = {
  'entity.read': 'viewer',
  'entity.update': 'admin',
  'entity.aiToggle': 'owner',
  'entity.audit': 'admin',
  'entity.delete': 'owner',
  'entity.transfer': 'owner',
  'entity.leave': 'viewer',
  'members.read': 'viewer',
  'members.invite': 'admin',
  'members.updateRole': 'admin',
  'members.remove': 'admin',
  'project.create': 'writer',
  'project.read': 'viewer',
  'project.update': 'writer',
  'project.trash': 'writer',
  'project.restore': 'writer',
  'project.purge': 'admin',
  'document.create': 'writer',
  'document.read': 'viewer',
  'document.export': 'viewer',
  'document.edit': 'writer',
  'document.comment': 'commenter',
  'document.chat': 'commenter',
  'document.activity': 'viewer',
  'document.trash': 'writer',
  'document.restore': 'writer',
  'document.move': 'writer',
  'document.lock': 'writer',
  'document.aiExclude': 'writer',
  'snapshot.create': 'writer',
  'snapshot.open': 'writer',
  'snapshot.fork': 'writer',
  'snapshot.cherryPick': 'writer',
  'snapshot.appendNote': 'writer',
  'snapshot.read': 'viewer',
  'snapshot.compare': 'viewer',
  'snapshot.hideForSelf': 'viewer',
  'version.restore': 'writer',
  'version.restoreAsCopy': 'writer',
  'share.manage': 'writer',
  'assets.upload': 'writer',
  'assets.link': 'writer',
  'assets.read': 'viewer',
  'ai.run': 'writer',
  'ai.review': 'commenter',
  'jobs.media': 'writer',
  'templates.manage': 'writer',
  'reports.run': 'viewer',
  'apiKeys.use': 'viewer',
} as const satisfies Record<string, Role>;

export type Permission = keyof typeof PERMISSION_MIN_ROLE;
export const PERMISSIONS = Object.keys(PERMISSION_MIN_ROLE) as Permission[];

/** 0 = owner ... 4 = viewer; a smaller number is more authority. */
const RANK: Record<Role, number> = {
  owner: 0,
  admin: 1,
  writer: 2,
  commenter: 3,
  viewer: 4,
};

/** True when `a` has at least the authority of `b`. */
export const roleAtLeast = (a: Role, b: Role): boolean => RANK[a] <= RANK[b];

/** The higher-authority of the given roles (nulls ignored); null when there are none. */
export function maxRole(...roles: (Role | null | undefined)[]): Role | null {
  let best: Role | null = null;
  for (const r of roles)
    if (r && (best === null || RANK[r] < RANK[best])) best = r;
  return best;
}

/** The lower-authority of two roles (used to cap an API key by its scope). */
export const minRole = (a: Role, b: Role): Role => (RANK[a] >= RANK[b] ? a : b);

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> =
  Object.fromEntries(
    ROLES.map((role) => [
      role,
      PERMISSIONS.filter((p) => roleAtLeast(role, PERMISSION_MIN_ROLE[p])),
    ])
  ) as unknown as Record<Role, readonly Permission[]>;

/** The only check routes call. */
export const hasPermission = (role: Role, permission: Permission): boolean =>
  roleAtLeast(role, PERMISSION_MIN_ROLE[permission]);

/** Lowest role that holds `permission` (goes in a 403's `details.requiredRole`). */
export const requiredRoleFor = (permission: Permission): Role =>
  PERMISSION_MIN_ROLE[permission];

/** Roles a share grant or a project/document invitation may carry: `owner` is never granted by share. */
export const SHARE_ROLES = ['admin', 'writer', 'commenter', 'viewer'] as const;
export type ShareRole = (typeof SHARE_ROLES)[number];

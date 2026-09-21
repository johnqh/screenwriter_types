/**
 * Spec 03 §3.2 write matrix as data, projected from spec 05's role matrix onto Y.Doc keys.
 * The server checks inbound updates against it; `markPermissionsFor` is what `subscribed` and
 * `roleChanged` send so a client can disable UI instead of being rejected.
 */
import type { Role } from '../tenancy/index.js';

/** Top-level Y.Doc keys a commenter may change (notes and replies, R6). */
export const COMMENTER_WRITABLE_KEYS: readonly string[] = ['notes'];

/** Inline marks a commenter may add or remove inside element text: note anchors `n:<NoteId>` and the highlighter. */
export const isCommenterMark = (name: string): boolean => name === 'hl' || name.startsWith('n:');

/** What a role may produce (courtesy for the UI; the server check is the authority). */
export interface MarkPermissions {
  /** Text, attributes, structure, tags, revisions, settings: everything an owner/admin/writer writes. */
  edit: boolean;
  /** Notes and replies (`notes` + `n:` marks). */
  comment: boolean;
  /** Highlighter (`hl` marks). */
  highlight: boolean;
}

export function markPermissionsFor(role: Role | 'none'): MarkPermissions {
  const edit = role === 'owner' || role === 'admin' || role === 'writer';
  const comment = edit || role === 'commenter';
  return { edit, comment, highlight: comment };
}

/** Roles that may send `update` frames at all (a commenter's are filtered by the matrix). */
export const canSendUpdates = (role: Role): boolean => role !== 'viewer';

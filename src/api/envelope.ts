/**
 * Response envelope, error vocabulary (spec 05 §12) and pagination shape.
 * Platform-free: no clock is read here, so the envelope carries no timestamp.
 */

/** Every REST error code and its fixed HTTP status (spec 05 §12). */
const ERROR_TABLE = [
  ['UNAUTHORIZED', 401],
  ['REAUTH_REQUIRED', 401],
  ['API_KEY_FORBIDDEN', 403],
  ['FORBIDDEN', 403],
  ['ROLE_ESCALATION', 403],
  ['NOT_FOUND', 404],
  ['PROJECT_NOT_FOUND', 404],
  ['DOCUMENT_NOT_FOUND', 404],
  ['SNAPSHOT_NOT_FOUND', 404],
  ['TEMPLATE_NOT_FOUND', 404],
  ['ITEM_NOT_FOUND', 404],
  ['ANCHOR_NOT_FOUND', 404],
  ['TARGET_NOT_FOUND', 404],
  ['VALIDATION', 400],
  ['COMMAND_INVALID', 422],
  ['TEMPLATE_INVALID', 422],
  ['CONFIRMATION_MISMATCH', 400],
  ['EPOCH_MISMATCH', 409],
  ['DOCUMENT_LOCKED', 423],
  ['DOCUMENT_BUSY', 409],
  ['JOB_ALREADY_RUNNING', 409],
  ['JOB_FINISHED', 409],
  ['JOB_NOT_FINISHED', 409],
  ['LAST_OWNER', 409],
  ['ALREADY_MEMBER', 409],
  ['NOT_A_MEMBER', 409],
  ['PERSONAL_WORKSPACE_IMMUTABLE', 409],
  ['OWNS_TEAM_WORKSPACE', 409],
  ['NOT_IN_TRASH', 409],
  ['PARENT_IN_TRASH', 409],
  ['FOLDER_DEPTH', 409],
  ['FOLDER_CYCLE', 409],
  ['MOVE_FORBIDDEN', 403],
  ['BUILTIN_IMMUTABLE', 409],
  ['LOCATOR_AMBIGUOUS', 409],
  ['INVITATION_INVALID', 410],
  ['INVITATION_EXPIRED', 410],
  ['INVITATION_CLOSED', 410],
  ['EMAIL_MISMATCH', 403],
  ['SHARE_LINK_INVALID', 404],
  ['SHARE_LINK_PASSWORD_REQUIRED', 401],
  ['WATERMARK_REQUIRED', 403],
  ['EDIT_WINDOW_CLOSED', 409],
  ['ASSET_TOO_LARGE', 413],
  ['IMPORT_TOO_LARGE', 413],
  ['UNSUPPORTED_FORMAT', 400],
  ['IMPORT_FAILED', 400],
  ['IMPORT_INVALID', 422],
  ['ASSET_TYPE_REJECTED', 415],
  ['ASSET_CHECKSUM_MISMATCH', 422],
  ['ASSET_NOT_READY', 409],
  ['ASSET_IN_USE', 409],
  ['UPLOAD_INCOMPLETE', 409],
  ['UPLOAD_EXPIRED', 410],
  ['STORAGE_QUOTA_EXCEEDED', 507],
  ['STORAGE_UNAVAILABLE', 503],
  ['IMPORT_FORMAT_UNSUPPORTED', 415],
  ['EXPORT_FORMAT_UNSUPPORTED', 415],
  ['COMPARE_TOO_LARGE', 413],
  ['LIMIT_EXCEEDED', 409],
  ['RATE_LIMITED', 429],
  ['QUOTA_EXCEEDED', 429],
  ['INSUFFICIENT_CREDITS', 402],
  ['AI_UNAVAILABLE', 503],
  ['AI_INPUT_TOO_LARGE', 413],
  ['AI_GENERATION_FAILED', 502],
  ['AI_OUTPUT_INVALID', 502],
  ['CONFIG_MISSING', 503],
  ['CLIENT_TOO_OLD', 426],
  ['CONTENT_CHANGED', 409],
  ['STYLE_NOT_IN_TEMPLATE', 422],
  ['NOT_CONTIGUOUS', 422],
  ['LOCKED_CONTENT', 409],
  ['NAME_COLLISION', 409],
  ['KIND_MISMATCH', 422],
  ['OVERLAPPING_SHOTS', 422],
  ['OVERLAPPING_NODE', 422],
  ['SCENES_LOCKED', 409],
  ['NOT_LOCKED', 409],
  ['RANGE_OUT_OF_BOUNDS', 422],
  ['INVALID_TARGET', 422],
  ['INVALID_DUAL_DIALOGUE', 422],
  ['FOUNTAIN_PARSE_ERROR', 422],
  ['UNMAPPED_STYLES', 422],
  ['RANGE_TOO_LARGE', 413],
  ['INVALID_REGEX', 400],
  ['REPORT_OPTIONS_INVALID', 400],
  ['SNAPSHOT_NOT_IN_DOCUMENT', 404],
  ['ITEM_NOT_IN_SNAPSHOT', 404],
  ['INVALID_LOCATOR', 400],
  ['LOCATOR_NOT_FOUND', 404],
  ['ROLE_NOT_ALLOWED_FOR_TARGET', 422],
  ['ID_CONFLICT', 409],
  ['IDEMPOTENCY_KEY_REUSED', 409],
  ['IDEMPOTENCY_IN_PROGRESS', 409],
  ['DEVICE_REVOKED', 403],
  ['MACRO_TRIGGER_TAKEN', 409],
  ['HANDOFF_INVALID', 410],
  ['WATERMARK_NOT_FOUND', 404],
  ['OCR_UNAVAILABLE', 503],
  ['GRAMMAR_UNAVAILABLE', 503],
  ['AI_CONSENT_REQUIRED', 403],
  ['AI_DISABLED_FOR_WORKSPACE', 403],
  ['AI_EXCLUDED_DOCUMENT', 403],
  ['AI_KEY_NOT_PERMITTED', 403],
  ['QUOTE_EXCEEDS_MAX', 402],
  ['AI_CONTENT_REFUSED', 422],
  ['SCOPE_TOO_LARGE', 413],
  ['SUGGESTION_UNAVAILABLE', 409],
  ['JOB_KIND_DISABLED', 501],
  ['JOB_KIND_NOT_GENERIC', 400],
  ['JOB_FAILED', 409],
  ['JOB_TIMEOUT', 504],
  ['LIKENESS_CONSENT_REQUIRED', 422],
  ['CONTENT_REJECTED', 422],
  ['INTERNAL', 500],
] as const;

type ErrorTable = typeof ERROR_TABLE;
export type ApiErrorCode = ErrorTable[number][0];

export const API_ERROR_CODES = Object.fromEntries(
  ERROR_TABLE.map(([code]) => [code, code])
) as { readonly [C in ApiErrorCode]: C };

/** HTTP status per error code. */
export const ERROR_STATUS = Object.fromEntries(ERROR_TABLE) as Record<
  ApiErrorCode,
  number
>;

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  /** Human-readable message. */
  error: string;
  code: ApiErrorCode;
  /** Code-specific details (e.g. `issues`, `index`, `ids`). */
  details?: Record<string, unknown>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function successResponse<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

/** The only constructor for failure envelopes. */
export function errorResponse(
  message: string,
  code: ApiErrorCode,
  details?: Record<string, unknown>
): ApiFailure {
  return details === undefined
    ? { success: false, error: message, code }
    : { success: false, error: message, code, details };
}

/** Cursor page: `nextCursor` is null on the last page. */
export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

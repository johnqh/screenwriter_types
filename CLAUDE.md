# screenwriter_types

Shared TypeScript types and Zod v4 schemas for Fadewright (frontend and backend). Platform-free ESM: no DOM, no Node built-ins, no clock reads. Consumers import from the package root only (plus `/test` for fixtures).

## Stack

TypeScript, Zod v4, Vitest, Bun. Depends on `@sudobility/writing_core` for ids, `DOCUMENT_KINDS` and `TemplateCategory`; `@sudobility/types` (B17, resolved from npm like any ordinary dependency — a stable, general-purpose types package, not a sibling under co-development) for the generic consumables shapes `src/credits/` re-exports.

## Structure

- `src/api/` envelope (`successResponse`, `errorResponse`, `API_ERROR_CODES`, `ERROR_STATUS`, `Paginated`), `cursorQuerySchema`, `API_ROUTES`
- `src/ids/` re-exports from writing_core
- `src/tenancy/`, `projects/`, `me/`, `templates/`, `versions/`, `commands/` DTOs and request schemas. `tenancy/` also holds the role/permission matrix (`PERMISSION_MIN_ROLE`, `ROLE_PERMISSIONS`, `hasPermission`, `roleAtLeast`, `maxRole`, `minRole`, `requiredRoleFor`; spec 05 §5.2)
- `src/sharing/` (B8) workspace/member/invitation/grant/share-link/lock DTOs and Zod request schemas (spec 05 §5.4, §6.2-6.4, §8.3)
- `src/ai/` spec 06 AI: `AI_TASKS`, `AI_LIMITS`, model-output Zod schemas per ShapeShyft endpoint (`AI_ENDPOINT_OUTPUT_SCHEMAS`, all-required and closed so `z.toJSONSchema` gives the stored endpoint schema), `CoverageReport`, job and suggestion-set DTOs. (B17) `AI_CONSENT_VERSION`, consent/estimate/activity/report DTOs, `suggestionDecideSchema`
- `src/credits/` (B17) a thin re-export of `@sudobility/types`' generic consumables shapes (the ledger itself is `@sudobility/consumables_service`'s, never redefined here) plus `CreditProduct` and the purchase-handoff request/response (spec 05 §6.20-6.21)
- `src/reads/` (B10) `?source=` schemas (`sourceParamSchema`, `docSourceSchema`), entity/tag/note/beat/bin/revision/change/stats/shot read DTOs (`EntityUsage`...), locator types (`ResolveResult`) and search schemas/hits
- `src/reports/` (B10) `REPORT_KINDS` (18), `REPORT_DEFS` (options and columns per kind, until writing_core owns them: spec 09 R25), `parseReportOptions`, `ReportResult`/`ReportTable`, `reportToCsv`
- `src/packets/` (B10) `scenePacketSchema`, `characterPacketSchema`, `locationPacketSchema`, `shotPacketSchema` (spec 11 §7; what MCP consumes) and `packetQuerySchema`
- `src/account/` (B13) `userPreferencesSchema` (closed at the top level, `USER_PREFERENCES_VERSION`, `baseUpdatedAt` PUT variant), dictionary, macro, writing session/stats/goal, `documentViewStateSchema` (`my-state`), account delete/export DTOs and limits
- `src/lifecycle/` (B14) project folders (`FOLDER_MAX_DEPTH` 8), purge/duplicate/move/apply-template DTOs, trash and workspace-documents queries (`TRASH_RETENTION_DAYS` 30, `TrashItem`), Shared Bin (`ProjectBinItem`, 2 MiB cap), `WorkspaceDefaults` (+ `baseUpdatedAt` PUT), contacts, and the job input schemas (`project.duplicate`, `doc.applyTemplate`, `template.thumbnail`, `system.purge`). `templates/` also holds template create/version/update/import/export DTOs (`TEMPLATE_FILE_FORMATS`, `.fwtemplate` envelope constants); `projects/` has `PROJECT_KINDS`, `documentLabelsSchema` and `DocumentListQuery.order`
- `src/io/` (B16) upload/import/export/watermark DTOs: `uploadStateRequestSchema`, `importCreateSchema` (`targetProjectId` xor `templateTarget`), `importOverSchema`, `importOptionsSchema`, `exportCreateSchema`, `exportCombinedSchema`, `batchWatermarkSchema`, `watermarkLookupSchema`, job input schemas (`import.*`, `doc.importOver`, `export.*`/`watermark.batch`), `JOB_IMPORT_FORMATS`/`JOB_EXPORT_FORMATS` (what writing_formats has), `EXPORT_CODE_PREFIX` `FWX-`; `templateImportByIdSchema` is in `templates/`
- `src/sync/` spec 03 frame schemas, message codes, close codes; `permissions.ts` the commenter write matrix as data (`COMMENTER_WRITABLE_KEYS`, `isCommenterMark`, `markPermissionsFor`)
- `src/public/` (B18, spec 05 §6.21, §6.24) `PublicConfig`, `NamesDbEntry`/`NamesDbResponse`, `DeepHealthResponse`, `WatermarkedDownloadInfo`, `purchaseHandoffRedeemSchema`, `telemetryRequestSchema`/`telemetryEventSchema`/`clientErrorReportSchema`
- `src/admin/` (B18, spec 05 §6.23) `AdminUserLookup`, `adminJobListQuerySchema` (a hand-written `AdminJobListQuery` interface sits beside it — `z.input<>` of the `.extend()`-derived schema resolved `limit` to `{}` under this repo's tsconfig for reasons not fully tracked down; avoided rather than chased), `adminJobKindPatchSchema`, `AdminJobKind`, `adminJobRefundSchema`, `AdminUserPurgeResponse` (documents why the route is a bounded schedule-and-revoke, not a real data purge)
- `src/test/` fixture factories (`makeWorkspace`, `makeProject`, `makeDocumentMeta`, `makeSnapshotSummary`)
- `src/index.ts` the barrel

## Commands

```bash
bun install
bunx tsc --noEmit      # typecheck
bunx vitest run        # smoke tests (never `bun test`)
bun run lint
```

## Local-path rule (no publishing)

`@sudobility/writing_core` resolves by path to the sibling repo: `tsconfig.json` `paths` and a `vitest.config.ts` alias both point at `../writing_core/src/index.ts`. Do not publish or bump versions. `bun run build` does not work in this mode (writing_core sits outside `rootDir`); downstream repos import `src` directly by path.

## Notes

- Envelope is `{success, data}` or `{success:false, error, code, details?}`, with no timestamp (no clock in this package).
- `ping` and `pong` share message code 4.
- Spec source: screenwriter_plans specs 05 (§1.1, §6, §10, §12) and 03 (§2).

## Related

`writing_core`, `screenwriter_api`, `screenwriter_client`, `screenwriter_lib`, `screenwriter_plans`

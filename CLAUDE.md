# screenwriter_types

Shared TypeScript types and Zod v4 schemas for Fadewright (frontend and backend). Platform-free ESM: no DOM, no Node built-ins, no clock reads. Consumers import from the package root only (plus `/test` for fixtures).

## Stack

TypeScript, Zod v4, Vitest, Bun. Depends on `@sudobility/writing_core` for ids, `DOCUMENT_KINDS` and `TemplateCategory`.

## Structure

- `src/api/` envelope (`successResponse`, `errorResponse`, `API_ERROR_CODES`, `ERROR_STATUS`, `Paginated`), `cursorQuerySchema`, `API_ROUTES`
- `src/ids/` re-exports from writing_core
- `src/tenancy/`, `projects/`, `me/`, `templates/`, `versions/`, `commands/` DTOs and request schemas. `tenancy/` also holds the role/permission matrix (`PERMISSION_MIN_ROLE`, `ROLE_PERMISSIONS`, `hasPermission`, `roleAtLeast`, `maxRole`, `minRole`, `requiredRoleFor`; spec 05 §5.2)
- `src/sharing/` (B8) workspace/member/invitation/grant/share-link/lock DTOs and Zod request schemas (spec 05 §5.4, §6.2-6.4, §8.3)
- `src/ai/` spec 06 AI: `AI_TASKS`, `AI_LIMITS`, model-output Zod schemas per ShapeShyft endpoint (`AI_ENDPOINT_OUTPUT_SCHEMAS`, all-required and closed so `z.toJSONSchema` gives the stored endpoint schema), `CoverageReport`, job and suggestion-set DTOs
- `src/sync/` spec 03 frame schemas, message codes, close codes; `permissions.ts` the commenter write matrix as data (`COMMENTER_WRITABLE_KEYS`, `isCommenterMark`, `markPermissionsFor`)
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

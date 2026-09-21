# screenwriter_types

Shared TypeScript types and Zod v4 schemas for Fadewright (frontend and backend). Platform-free ESM: no DOM, no Node built-ins, no clock reads. Consumers import from the package root only (plus `/test` for fixtures).

## Stack

TypeScript, Zod v4, Vitest, Bun. Depends on `@sudobility/writing_core` for ids, `DOCUMENT_KINDS` and `TemplateCategory`.

## Structure

- `src/api/` envelope (`successResponse`, `errorResponse`, `API_ERROR_CODES`, `ERROR_STATUS`, `Paginated`), `cursorQuerySchema`, `API_ROUTES`
- `src/ids/` re-exports from writing_core
- `src/tenancy/`, `projects/`, `me/`, `templates/`, `versions/`, `commands/` DTOs and request schemas
- `src/sync/` spec 03 frame schemas, message codes, close codes
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

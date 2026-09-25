# @sudobility/screenwriter_types

Shared TypeScript types and Zod schemas for the ViaInk screenwriting app, used by both the frontend and the backend.

## Contents

- API envelope helpers, error codes, cursor pagination, and a route table
- Workspace, project, document, template, version and snapshot types
- Request schemas (projects, documents, snapshots, commands, `/me`)
- Sync WebSocket frame schemas and close codes
- Fixture factories under `@sudobility/screenwriter_types/test`

## Usage

```ts
import { successResponse, errorResponse, documentCreateSchema } from '@sudobility/screenwriter_types';

const body = documentCreateSchema.parse({ title: 'Draft', kind: 'script' });
return successResponse(body);
```

## Development

```bash
bun install
bunx tsc --noEmit
bunx vitest run
```

This package currently resolves `@sudobility/writing_core` from a sibling checkout by path and is not published.

## License

BUSL-1.1

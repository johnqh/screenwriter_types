import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// import.meta.url (not __dirname): works under both Vite's legacy and "native" ESM config loaders.
const r = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

/**
 * Bundled library build (Rollup, via Vite's library mode) — one file per entry point, each
 * tree-shaken independently: `keys` (imported standalone by screenwriter_api_mcp specifically to
 * avoid pulling in `@sudobility/writing_core`) stays small because Rollup only follows *that entry's*
 * own import graph, not the whole package's.
 *
 * Declarations are NOT generated here: `tsconfig.build.json`'s own separate `tsc
 * --emitDeclarationOnly` pass produces them (see `package.json`'s `build` script) — a real,
 * multi-entry Rollup + hand-rolled `.d.ts` generation combination is fragile; a plain second `tsc`
 * pass over the whole `src` tree is simpler and matches this file tree exactly (same pattern as
 * `seo_lib`).
 */
export default defineConfig({
  build: {
    lib: {
      entry: {
        index: r("src/index.ts"),
        test: r("src/test/index.ts"),
        keys: r("src/keys/index.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      // Real npm dependencies, never bundled into this package's own output.
      external: ["zod", "@sudobility/types", "@sudobility/writing_core", "lib0"],
    },
    sourcemap: true,
    minify: false,
  },
});

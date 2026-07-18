import { defineConfig } from "vite";
import { coverageConfigDefaults } from "vitest/config";

// Relative base so the built site works when served from any subpath
// (e.g. apps.charliekrug.com/ringwood), not just the domain root.
export default defineConfig({
  base: "./",
  build: {
    // Committed as the deploy artifact: the host serves site/ verbatim from
    // apps.charliekrug.com/ringwood, so the built output is tracked, not ignored.
    outDir: "site",
    emptyOutDir: true,
  },
  test: {
    environment: "node",
    coverage: {
      // site/ is the committed build artifact (see build.outDir above), not
      // source — scanning it as 0%-covered "code" skews the real number.
      // Extends (not replaces) vitest's own default exclusions.
      exclude: [...coverageConfigDefaults.exclude, "site/**"],
    },
  },
});

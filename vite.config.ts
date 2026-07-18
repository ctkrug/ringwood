import { defineConfig } from "vite";

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
  },
});

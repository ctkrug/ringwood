# Architecture

Client-only TypeScript/Vite app. No backend — everything runs in the browser against the
public GitHub REST API. Build output is static and base-path-relative (see `vite.config.ts`'s
`base: "./"`), so it can be served from a subpath.

## Data flow

```
repo input (owner/repo or URL)
  → github/client.fetchCommitHistory     paginated commit list (sha + date)
  → rings/compute.bucketCommitsByYear    commit dates → per-year counts (silent years filled)
  → rings/compute.computeRings           per-year counts → sqrt-scaled ring thickness

  → rings/compute.groupCommitsByYear     commits → per-year commit records (for sampling)
  → github/sampleLanguages.sampleYearLanguages
                                          per year, fetches file lists for an evenly-spaced
                                          sample of commits (github/client.fetchCommitFiles)
  → rings/language.aggregateLanguages    file paths → language counts (extension map)
  → rings/language.toBands               language counts → normalized share + stable color
  → rings/compute.attachLanguageBands    merges bands onto the rings from computeRings

  → render/geometry.computeRingRadii     ring thicknesses → inner/outer pixel radii
  → render/animate.animateRings          grows rings outward one at a time (rAF, eased),
                                          or render/canvas.renderRings for an instant paint
```

`ui/app.ts` (`mountApp`) wires the above into the DOM: it owns the input/button/canvas
elements, drives the fetch → sample → animate sequence on submit, cancels any in-flight
animation before starting a new one, and resizes the canvas to the container at
`devicePixelRatio` on load and on window resize.

## Modules

- **`github/client.ts`** — `parseRepoInput` (owner/repo or URL → `RepoRef`), `fetchCommitHistory`
  (paginated commit list, throws `GitHubApiError` on 404/403/other), `fetchCommitFiles`
  (single commit's touched files; degrades to `[]` on failure since it's an enhancement, not
  the core render).
- **`github/sampleLanguages.ts`** — `pickSample` (evenly-spaced subset, always includes first/
  last), `sampleYearLanguages` (bounds file-list fetches per year so a large repo's language
  pass doesn't exhaust GitHub's unauthenticated 60/hr rate limit).
- **`rings/compute.ts`** — pure year-bucketing and thickness math (`bucketCommitsByYear`,
  `computeRings`, `sqrt` scale so thickness reads as ring *area*), plus `groupCommitsByYear`
  and `attachLanguageBands` for merging the async-sampled language data onto rings.
- **`rings/language.ts`** — extension → language name map, a deterministic name → palette-color
  hash (`colorForLanguage`, stable across renders/sessions), and count/share aggregation
  (`aggregateLanguages`, `toBands`).
- **`render/geometry.ts`** — `computeRingRadii`: pure thickness → inner/outer radius math,
  shared by the static renderer and the animation so there's one source of truth for layout.
- **`render/canvas.ts`** — `renderRings` (instant full paint) and `renderRingsFrame` (paints
  every ring at a given growth progress 0..1); draws each ring's language bands as angular
  sector wedges rather than a solid disc.
- **`render/animate.ts`** — `animateRings`: sequences ring growth one at a time via
  `requestAnimationFrame`, eased with a cubic ease-out; returns a `cancel()`/`done` handle so
  the UI can stop a stale animation before starting the next. Honors `reducedMotion` for an
  instant final render.
- **`ui/app.ts`** — DOM wiring: form submit flow, status messaging, canvas DPR sizing/resize,
  and the idle-state placeholder shown before the first successful grow.

## Known trade-off: language sampling, not full scan

GitHub's commit-list endpoint doesn't return per-commit file changes; only the single-commit
endpoint does, and that's one API call per commit. A repo can have thousands of commits in a
single year, so `sampleYearLanguages` samples a fixed number (default 5, evenly spaced) per
year instead of fetching every commit's files. This keeps a large repo like `torvalds/linux`
inside GitHub's unauthenticated rate limit (60 req/hr) at the cost of the language mix being
an approximation rather than an exact per-commit tally. A year whose sample returns no
recognized files (e.g. binary-only or a sparse repo) renders as a neutral "Unknown" band
rather than an error.

## Run / test

- `npm run dev` — Vite dev server.
- `npm test` — Vitest (all logic modules are pure functions or take injectable network
  dependencies, so tests run without hitting the real GitHub API).
- `npm run typecheck` / `npm run build` — `tsc --noEmit` then `vite build` to `dist/`.

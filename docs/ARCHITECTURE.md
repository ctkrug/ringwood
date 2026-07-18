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
                                          firing onRingComplete per ring for SFX,
                                          or render/canvas.renderRings for an instant paint

  → render/hitTest.findRingAtPoint       pointer/keyboard position → ring geometry
  → ui/ringStats.formatRingSummary       ring → "year · commits · language" tooltip text
  → render/canvas.drawRingHighlight      strokes the hovered/focused ring's outline

  → ui/treeState.describeTreeState       ring count → empty/sapling/grown state + message
  → rings/legend.buildLegend             rings → deduped, share-ranked legend entries
  → export/filename.formatExportFilename repo ref → "owner-repo-ringwood.png"
```

`ui/app.ts` (`mountApp`) wires the above into the DOM: it owns the input/button/canvas
elements, drives the fetch → sample → animate sequence on submit, cancels any in-flight
animation before starting a new one, and resizes the canvas to the container at
`devicePixelRatio` on load and on window resize. It also owns the hover/tap/keyboard ring
tooltip, the tabbable per-year chip list, the language legend, the mute toggle wired to
`audio/sfx.ts`, the export-PNG button, the designed empty/sapling tree-note, the warm glow
pulse on the final ring, and the designed error banner shown on invalid input or a failed
fetch.

## Modules

- **`github/client.ts`** — `parseRepoInput` (owner/repo or URL → `RepoRef`), `fetchCommitHistory`
  (paginated commit list; throws `GitHubApiError` on 404/other, and on 403 with nothing fetched
  yet, but returns `{ commits, truncated: true }` on a 403 after earlier pages already
  succeeded — a large repo renders a partial, most-recent-first tree instead of nothing).
  Response bodies are treated as untrusted: each list entry's shape is checked before it's read
  so one malformed commit is skipped rather than costing the whole page, and a body that can't
  be parsed or isn't an array (a captive portal answering 200 with HTML) takes the same
  partial-tree path as a 403 instead of escaping as a raw `SyntaxError`. Also exports
  `fetchCommitFiles` (single commit's touched files; degrades to `[]` on failure and filters out
  any entry with a non-string `filename` since it's an enhancement, not the core render).
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
- **`render/canvas.ts`** — `renderRings` (instant full paint), `renderRingsFrame` (paints
  every ring at a given growth progress 0..1, drawing language bands as angular sector wedges),
  and `drawRingHighlight` (strokes a translucent outline over one ring's annulus for hover/
  focus feedback without repainting the whole tree).
- **`render/animate.ts`** — `animateRings`: sequences ring growth one at a time via
  `requestAnimationFrame`, eased with a cubic ease-out; returns a `cancel()`/`done` handle so
  the UI can stop a stale animation before starting the next. Honors `reducedMotion` for an
  instant final render (and skips the per-ring `onRingComplete` callback in that mode, so no
  ticks in a reduced-motion render). `ringsJustCompleted` is the pure completion-diff helper
  the loop uses to fire that callback exactly once per ring.
- **`render/hitTest.ts`** — `findRingAtPoint`/`findRingAtDistance`: pure radius math that maps
  a pointer position (or a synthetic point derived from a keyboard-focused year) to the ring
  geometry under it, shared by mouse, touch, and keyboard entry points.
- **`audio/sfx.ts`** — `createSfxPlayer`: WebAudio-synthesized tick/chime SFX. The
  `AudioContext` is created lazily on the first actual sound (first user gesture, per browser
  autoplay policy) via an injectable constructor, and mute state persists through an injectable
  storage (defaults to `localStorage`) — both are no-ops/degrade gracefully when unavailable
  (e.g. the test runner), so nothing throws.
- **`ui/ringStats.ts`** — `formatRingSummary`: one ring → its "year · commits · language" line,
  shared verbatim by the floating tooltip and each year-chip's `aria-label` so mouse, touch, and
  keyboard users read identical text.
- **`ui/treeState.ts`** — `describeTreeState`: classifies a finished fetch's ring count into
  `"empty"` (zero commits), `"sapling"` (exactly one ring), or `"grown"`, each with its designed
  message, so `app.ts` never has to inline that branching or leave a bare/blank canvas for a
  small repo.
- **`rings/legend.ts`** — `buildLegend`: aggregates every ring's language bands into a deduped
  list ranked by total share across the whole tree (ties broken alphabetically), so the legend
  reflects the current repo's real mix rather than a static or stale list.
- **`export/filename.ts`** — `formatExportFilename`: slugifies an owner/repo pair into the
  downloaded PNG's filename (e.g. `torvalds-linux-ringwood.png`).
- **`ui/app.ts`** — DOM wiring: form submit flow, status messaging and the designed error
  banner, canvas DPR sizing/resize, hover/tap/keyboard ring tooltips with on-canvas highlight,
  the mute toggle, the language legend, the export-PNG button (enabled once `animateRings`'
  `done` promise resolves), the empty/sapling tree-note, the warm glow pulse fired from
  `onRingComplete`'s final ring, and the idle-state placeholder shown before the first
  successful grow.

## Known trade-off: language sampling, not full scan

GitHub's commit-list endpoint doesn't return per-commit file changes; only the single-commit
endpoint does, and that's one API call per commit. A repo can have thousands of commits in a
single year, so `sampleYearLanguages` samples a fixed number (default 5, evenly spaced) per
year instead of fetching every commit's files, trading an exact per-commit tally for an
approximation that stays well inside GitHub's unauthenticated rate limit (60 req/hr). A year
whose sample returns no recognized files (e.g. binary-only or a sparse repo) renders as a
neutral "Unknown" band rather than an error.

The pagination itself is the harder ceiling: commit history is fetched 100 per request, so one
hour of quota covers ~6,000 commits regardless of sampling. A repo past that (`torvalds/linux`,
at 1.4M+ commits, would need ~14,600 requests) still renders — `fetchCommitHistory` returns the
commits already paginated with `truncated: true` rather than throwing away that work — but the
tree only reflects its most recent slice of history, and `ui/app.ts` says so in the status line.

## Run / test

- `npm run dev` — Vite dev server.
- `npm test` — Vitest (all logic modules are pure functions or take injectable network
  dependencies, so tests run without hitting the real GitHub API).
- `npm test -- --coverage` — v8 coverage report (`@vitest/coverage-v8`); core logic modules
  (`rings/`, `render/`, `github/client.ts`, `export/`, `audio/`) run 99-100%. `ui/app.ts` is DOM
  wiring rather than algorithmic logic and is covered separately via `tests/ui.app.test.ts`,
  which mounts the real app in `happy-dom` (see that file's `stubCanvasContext` helper for how
  canvas calls are faked without a native canvas binding).
- `npm run typecheck` / `npm run build` — `tsc --noEmit` then `vite build` to `site/`, the tracked deploy artifact.

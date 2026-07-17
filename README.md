# Ringwood

Paste any public GitHub repo and watch its commit history grow like a tree — one ring per
year, ring thickness for shipping volume, color banding for which languages touched that year.

**[torvalds/linux](https://github.com/torvalds/linux)** has thirty-plus rings. Thin, brittle
years next to thick, vivid ones. Instantly readable at a glance, and no two repos ever grow
the same tree.

## Why

Commit graphs and contribution heatmaps all look the same after a while — a grid of green
squares that flattens a decade of work into noise. A tree doesn't do that. Growth rings are a
natural language for "how much happened, and how it changed" that anyone can read without a
legend, because dendrochronology already trained us to read them: wide ring, good year; narrow
ring, lean year; a scar, a drought.

Ringwood takes a GitHub repo's real commit history and renders it as an actual cross-section —
one ring per calendar year the repo was active, ring width mapped to that year's shipping
volume, and color bands within each ring showing which languages were touched. The result is a
single image built entirely from live data, not a template: paste a different repo, get a
different tree.

## How it works

1. Paste a public `owner/repo` (or a GitHub URL).
2. Ringwood pulls the repo's commit history via the GitHub REST API, entirely client-side —
   no server, no stored credentials, no backend.
3. Commits are bucketed by year and by the languages present in the files they touched.
4. Each year becomes one ring: width scales with that year's commit volume relative to the
   repo's own history, and the ring is banded by language share.
5. The whole tree renders on a `<canvas>`, one ring growing outward at a time, ending in a
   single shareable image.

## What works today

- Paste-a-repo flow with inline validation and a designed error banner for GitHub 404s and
  actionable ("try again in N minutes") 403 rate-limit responses.
- Full paginated commit history fetch, bucketed into one ring per calendar year.
- Year-by-year ring growth animation (staggered, eased outward), thickness driven by commit
  volume, with `prefers-reduced-motion` support and clean cancellation on resubmit.
- Language color banding per ring, sampled from each year's touched files.
- Canvas scales to `devicePixelRatio` and redraws on resize.
- Hover or tap a ring for a tooltip with that year's commit count and dominant language; a
  tabbable year-chip list gives keyboard users the same stats without hovering.
- Synth WebAudio tick per completed ring, a brighter chime on the last, and a mute toggle
  whose state persists across reloads.

## Planned

- A language legend keyed to the repo's actual mix.
- Export the finished tree as a shareable PNG.
- Designed empty/small-repo states (single-year "sapling", zero-commit repo).

## Stack

TypeScript + Canvas, built with [Vite](https://vitejs.dev/). Fully static and client-only —
no backend, no build-time secrets, no database. Talks directly to the GitHub REST API from
the browser.

## Status

Core ring rendering is in place: paste a repo, watch it grow. See
[`docs/VISION.md`](docs/VISION.md) for the full design rationale,
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the pieces fit together, and
[`docs/BACKLOG.md`](docs/BACKLOG.md) for the build plan.

## Development

```bash
npm install
npm run dev       # local dev server
npm run build     # production build to dist/
npm test          # unit tests
```

## License

MIT — see [LICENSE](LICENSE).

# Ringwood

**▶ Live demo: [apps.charliekrug.com/ringwood](https://apps.charliekrug.com/ringwood/)**

[![CI](https://github.com/ctkrug/ringwood/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/ringwood/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

See any GitHub repo's history as growth rings. Paste a public repository, watch one ring grow
for every year it was active, and export the finished trunk as a PNG.

![A grown Ringwood tree: twelve concentric rings in warm parchment, rust, and moss tones, with a per-year chip list and a ranked language legend beside it](docs/images/demo.png)

## Why rings

Every tool that visualizes a repository produces the same picture: a contribution heatmap, a
commit-frequency chart, a grid of green squares. They are accurate and nobody ever posts them.

Growth rings are a format people already read without a legend. Wide ring, good year. Thin
ring, quiet year. A project that went dormant for two years and came back keeps those lean
years as visible scars instead of dropping them off the chart. Dendrochronology solved this
visual problem centuries ago, and commit history happens to fit the same shape.

## What it does

- **One ring per calendar year.** Ring width scales with that year's commit count against the
  repo's own busiest year, so a tree reflects the project's shape rather than absolute volume.
- **Color bands by language.** Each ring is banded by the languages its commits actually
  touched, sampled from the files in those commits, with a ranked legend beside the tree.
- **Grows in front of you.** Rings ease outward one year at a time, with a synthesized tick per
  ring and a brighter chime on the last. Mute persists across reloads.
- **Inspect any year.** Hover or tap a ring for its commit count and dominant language. A
  tabbable list of year chips gives keyboard users the same stats.
- **Export a PNG.** One button, named after the repo, for example
  `torvalds-linux-ringwood.png`. The button turns on once the tree finishes growing.
- **Honest failure states.** A missing repo says so. A rate limit says how many minutes are
  left. A repo with no commits gets a designed empty state instead of a blank canvas.

## Usage

Open the [live demo](https://apps.charliekrug.com/ringwood/) and paste one of:

```
torvalds/linux
https://github.com/facebook/react
https://github.com/rust-lang/rust/tree/master/library
```

Shorthand, full URLs, branch and file URLs, `.git` suffixes, and pasted query strings all
resolve to the same repository. Press Grow, then Export PNG once the last ring lands.

`torvalds/linux` is the one worth trying first. Thirty-plus rings, a trunk that visibly
thickens through the 2010s, and a band mix that stays stubbornly C the whole way down.

## Limits

Ringwood talks to the public GitHub REST API from the browser with no token, which means:

- **Public repositories only.** There is no auth step, so there is no way to reach a private repo.
- **60 requests per hour per IP.** GitHub's anonymous ceiling. A large repo's full history takes
  several paginated requests, so back-to-back runs on big repos can hit it. The error tells you
  when it resets.

## Stack

TypeScript and Canvas, built with [Vite](https://vitejs.dev/). Fully static and client-only:
no backend, no build-time secrets, no database, nothing stored about what you paste.

Ring thickness uses `sqrt(count / max)` rather than a linear scale. A ring's visible area grows
faster than its thickness the further out it sits, so linear scaling makes recent years look
much larger than they were.

## Development

```bash
npm install
npm run dev        # local dev server
npm run build      # production build to site/
npm test           # unit tests
npm run typecheck  # tsc, no emit
```

See [`docs/VISION.md`](docs/VISION.md) for the design rationale,
[`docs/DESIGN.md`](docs/DESIGN.md) for the visual direction, and
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the modules fit together.

## License

MIT. See [LICENSE](LICENSE).

---

More of Charlie's projects → [apps.charliekrug.com](https://apps.charliekrug.com)

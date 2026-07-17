# Vision

## The problem

Every tool for visualizing a repo's history looks like the same thing: a contribution
heatmap, a commit-frequency bar chart, a dashboard of line graphs. They're accurate and
completely forgettable — a decade of shipping compressed into a grid of green squares that
tells you "yes, this person committed code," and nothing about the shape of the work. None
of them are things you'd actually want to post. They read as analytics, not as a portrait
of a project.

## Who it's for

Developers and maintainers who want a genuinely shareable artifact for a repo they're proud
of — "look how far this thing has grown" — plus anyone curious what a famous repo's history
actually looks like shaped this way (paste `torvalds/linux`, paste your own side project,
compare). It's a toy first, a portfolio piece second; no login, no server, no setup.

## The core idea

Dendrochronology already gave us a visual language for "how much happened, and how it
changed, over which years" — a real tree trunk. A wide ring means a good year of growth; a
narrow ring means a lean one; a scar means a season the tree nearly stopped. That mapping
transfers almost exactly onto commit history: one ring per calendar year, ring thickness
scaled to that year's commit volume relative to the repo's own history, and color banding
within a ring showing which languages were touched that year. The result isn't a chart you
have to learn to read — it's a picture anyone already knows how to read at a glance.

Crucially, this is **not** a static illustration or a canned SVG template. Every tree is
computed live from the GitHub REST API against real commit data, entirely in the browser.
Paste a different repo and you get a genuinely different tree — different ring counts,
different proportions, different color mixes — because the shape comes from the data, not
from a design system slot.

## Key design decisions

- **Client-only, static, no backend.** Everything — the GitHub fetch, the ring math, the
  canvas render — runs in the browser. No server to run, no API keys to leak, no database.
  This keeps the $0-hosting bar trivial and means the whole thing can live at a static
  subdomain path.
- **Sqrt-scaled ring thickness, not linear.** A ring's *visual area* at a large radius grows
  faster than its thickness for the same linear share, so linear scaling makes outer rings
  look artificially dominant. Scaling by `sqrt(count / max)` keeps perceived growth
  proportional to actual commit volume across the whole tree, not just the outer edge.
- **Silent years become scars, not gaps.** A repo that went dormant for two years and came
  back shouldn't have those years vanish from the ring count — they render as thin,
  near-floor rings, which is exactly what a real drought year looks like on a cut trunk.
- **One shareable image, not a dashboard.** No tabs, no filters, no drill-down UI beyond a
  hover tooltip per ring. The finished tree is meant to be exported as a single PNG and
  posted — the entire product is optimized for that one artifact, not for exploration.
- **Anonymous GitHub API only, no auth.** Keeps the tool zero-setup at the cost of a 60
  request/hour rate limit on the client's IP; the UI must surface that limit honestly
  instead of failing silently, since a large repo's full history can take several paginated
  requests.

## What "v1 done" looks like

- Paste `torvalds/linux` (or any public repo), the tree renders all of its rings, growing
  outward one year at a time, and the result is recognizably "this repo's shape" versus a
  small side project's shape.
- Ring thickness and color banding are driven entirely by real commit + language data for
  that repo — no placeholder or mocked visuals.
- The finished tree exports as a single PNG suitable for posting.
- The page looks and feels intentionally designed per `docs/DESIGN.md` — not a functional
  but generic stub — at both desktop and phone widths.
- Rate limits, invalid input, and repos with no history all produce a real, designed message
  instead of a silent failure or a raw error.

# Backlog

Epics and stories for the build phase. Every story lists verifiable acceptance criteria — a
later run should be able to check each one true/false, not just "looks right."

## Epic 1 — Core ring rendering (the wow moment)

- [x] **1.1 Paste a repo, watch its tree grow** — *the wow moment; must land first.*
  - Pasting `torvalds/linux` and clicking "Grow the tree" renders 30+ concentric rings.
  - Rings animate in outward from the center, oldest year first, not painted instantly.
  - Pasting a small repo (e.g. a repo with 2 years of history) renders exactly 2 rings, not
    an error or an empty canvas.

- [x] **1.2 Full commit history via paginated fetch**
  - `fetchCommitHistory` follows pagination until GitHub returns a page shorter than
    `per_page`, collecting every commit rather than stopping at page 1.
  - A repo with 10,000+ commits (e.g. `torvalds/linux`) completes without hanging the UI —
    fetch progress is visibly reflected in the status line while it runs.
  - A 403 rate-limit response surfaces the existing `GitHubApiError` message in the UI
    instead of a silent failure or unhandled exception.

- [x] **1.3 Per-year language detection for color banding**
  - Each year's ring is split into color bands proportional to that year's language mix,
    derived from file extensions touched in that year's commits.
  - A year touching only one language renders as a single solid band, not multiple.
  - Language-to-color mapping is stable across repeat renders of the same repo (same repo,
    same colors every time).

- [x] **1.4 Ring growth animation**
  - Rings grow radially over 500–800ms each, staggered outward per `docs/DESIGN.md`, not a
    single instant paint.
  - `prefers-reduced-motion: reduce` renders the finished tree immediately with no tween.
  - Re-submitting a new repo while a previous animation is running cancels the old render
    cleanly (no overlapping/ghosted rings on canvas).

- [x] **1.5 Design polish — hero layout**
  - Desktop (1440×900): the canvas occupies ~65% of viewport width per `docs/DESIGN.md`
    layout intent, with the input/stat rail alongside it — no dead background margins.
  - Phone (390×844): canvas moves above the input, fills ~60vh, no horizontal scroll.
  - Fraunces/Work Sans fonts and the parchment/rust/moss token palette are applied, not the
    browser default sans and unstyled colors.

## Epic 2 — Interaction and resilience

- [x] **2.1 Hover/tap a ring for year stats**
  - Hovering (desktop) or tapping (touch) a ring shows a tooltip with that year, commit
    count, and dominant language.
  - Tooltip dismisses on mouse-out / tap-elsewhere and never traps keyboard focus.
  - Keyboard users can reach the same per-year stats via a focusable, tabbable control (not
    hover-only).

- [x] **2.2 Designed error and rate-limit states**
  - An invalid input (e.g. `"not a repo"`) shows an inline, designed error message — no raw
    `fetch` rejection text on screen.
  - A GitHub 404 (repo doesn't exist) and a 403 (rate limit) render visibly different
    messages, each actionable ("try again in N minutes" for rate limit).
  - Error state uses `--danger` token styling and doesn't collapse the layout around it.

- [x] **2.3 Synth SFX and mute toggle**
  - Each completed ring plays a short WebAudio-synthesized tick per `docs/DESIGN.md`; the
    final ring plays a distinct, brighter chime.
  - A mute button toggles sound and its state persists across a page reload via
    `localStorage`.
  - No `AudioContext` is created until the first user gesture (grow click), and the app
    doesn't throw in an environment without `AudioContext` (e.g. the test runner).

- [x] **2.4 Responsive at 390 / 768 / 1440**
  - No horizontal scroll and no overlapping elements at any of the three widths.
  - Touch targets (button, mute toggle, ring focus targets) are ≥44px at phone width.
  - Layout re-composes (not just shrinks) between phone and desktop per `docs/DESIGN.md`.

- [x] **2.5 Design polish — interaction states**
  - Every control (input, buttons, mute toggle) has themed hover, focus-visible, active, and
    disabled states — none render as an unstyled native element.
  - Tab order reaches every interactive element in a sane sequence; focus rings are visible
    against the parchment background.

## Epic 3 — Export and finishing

- [ ] **3.1 Export the tree as a PNG**
  - An "Export" button is disabled until a tree has finished growing, then enables with a
    small scale-in per the juice plan.
  - Clicking Export downloads a PNG containing the rendered tree at canvas resolution (not a
    screenshot of the whole page).
  - Exported PNG filename includes the repo name (e.g. `torvalds-linux-ringwood.png`).

- [ ] **3.2 Language legend keyed to the real repo mix**
  - The legend lists only languages actually present in the fetched repo's history, each
    swatched with its band color from the tree — no placeholder/static legend entries.
  - Legend updates when a new repo is grown; it doesn't carry over the previous repo's
    languages.

- [ ] **3.3 Graceful small/empty-repo handling**
  - A repo with a single year of history still renders one full ring plus a designed
    "still a sapling" empty-ish state, not a bare canvas.
  - A repo with zero commits (freshly created, empty) shows a designed message instead of
    a blank canvas or thrown error.

- [ ] **3.4 Design polish — signature detail and finishing glow**
  - The animated ring wordmark (the two "o"s in Ringwood) plays its growth pulse once on
    page load per `docs/DESIGN.md`.
  - The finished tree pulses with a brief warm glow on its final ring completing, per the
    juice plan's goal/success pop.

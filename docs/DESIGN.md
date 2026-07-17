# Design direction

## 1. Aesthetic direction

**Botanical / organic.** Ringwood renders a literal cross-section of a tree, so the chrome
around it should feel like it was cut from the same trunk — not a SaaS dashboard bolted onto
a canvas. Warm parchment-paper surfaces, heartwood-brown ink, moss and rust accents pulled
straight from real ring color, and a page that feels handled rather than manufactured. The
last several ships leaned hard on blueprint/technical (navy + cyan schematics); Ringwood
deliberately breaks that streak with warm, organic, paper-and-wood tones instead of cold
navy linework.

## 2. Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f2e6c9` | page background — warm parchment |
| `--surface-1` | `#e8d8ac` | cards, input panel |
| `--surface-2` | `#d4bd86` | recessed panels, stat chips |
| `--text` | `#2b2013` | primary text — dark heartwood brown |
| `--text-muted` | `#6e5b3e` | secondary text, captions |
| `--accent` | `#bb5a2c` | rust/amber — primary CTA, active ring highlight |
| `--accent-support` | `#4f6b3a` | moss green — secondary language band, links |
| `--success` | `#4f7a3a` | fetch succeeded, ring complete |
| `--danger` | `#a13a2b` | rate-limit / not-found errors |

- **Display font:** [Fraunces](https://fonts.google.com/specimen/Fraunces) (variable, high
  optical size) for the wordmark and headings — a serif with organic, slightly irregular
  terminals that reads like a field-guide title, not a tech-brand.
- **UI font:** [Work Sans](https://fonts.google.com/specimen/Work+Sans) for body copy, inputs,
  and stat labels — clean and legible at small sizes, quiet next to Fraunces.
- System fallback stack: `"Fraunces", Georgia, serif` / `"Work Sans", -apple-system, sans-serif`.
- **Spacing:** 8px base unit (8/16/24/32/48/64).
- **Corner radius:** 12px on cards and inputs, 999px (full) on pills/buttons — soft, no sharp
  technical edges.
- **Shadow:** soft warm-toned shadow (`0 4px 16px rgba(43, 32, 19, 0.18)`), never cool gray.
- **Motion:** UI transitions 160–220ms ease-out. Ring growth animates 500–800ms per ring,
  staggered outward so the tree visibly builds itself rather than popping in complete.

## 3. Layout intent

The hero **is** the tree: a large canvas cross-section centered in the viewport, taking ~65%
of viewport width on desktop (1440×900) with the paste-a-repo input and per-ring stat panel
in a narrower left rail. On phone (390×844) the canvas moves to the top and fills ~60vh width-
capped to the viewport, with the input and stats stacked below — never squeezed beside the
tree. No dead parchment margins: the background carries a subtle paper-grain texture so empty
space still reads as "material," not blank fill.

## 4. Signature detail

The wordmark: the two "o"s in **Ringwood** are drawn as tiny concentric growth rings instead
of plain letterforms, animating a slow one-time growth pulse on page load — a two-second
preview of the exact interaction the tool performs on a full tree.

## 5. Juice plan (toy feedback)

Ringwood is a toy, not a game, but growth should still feel alive:

- **Ring growth tween:** rings animate outward one at a time (500–800ms each, ease-out),
  not a single instant paint.
- **Impact feedback:** hovering a ring pulses its band slightly brighter and lifts a tooltip
  with that year's stats (commits, dominant language).
- **Goal/success pop:** when the final ring completes, the whole tree gets a brief warm glow
  pulse and the export button becomes active with a small scale-in.
- **Synth SFX** (WebAudio, generated in code, no audio files): a soft low "creak" tick as each
  ring completes growing, and a slightly brighter chime on the final ring. Subtle volume,
  rate-throttled to one sound per ring max. Mute toggle persisted in `localStorage`.
- Respect `prefers-reduced-motion`: skip the growth tween and glow, render the finished tree
  directly, keep sound optional and off by default in that mode.

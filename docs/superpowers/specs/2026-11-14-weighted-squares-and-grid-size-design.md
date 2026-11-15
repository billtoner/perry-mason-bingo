# Design: weighted squares + selectable 4×4 / 5×5 grid

**Date:** 2026-11-14
**Status:** implemented (2026-11-14)

## Intent / why
Two linked improvements to make the game fairer and more flexible:
1. **Weighted squares.** Each square gets a 1–5 weight (5 = happens in almost
   every episode, 1 = rare). The card draw is biased by weight so common,
   markable events fill most cells and rare events show up as occasional
   seasoning — instead of today's blind uniform shuffle, which can deal a card
   stuffed with no-show squares.
2. **Selectable grid size.** The player chooses 4×4 or 5×5 up front. 4×4 (4 in a
   row) completes faster — a better fit for a single ~50-minute episode; 5×5 is
   the longer game. Grid size is a difficulty/pace lever that composes with the
   weighting.

## Goals
- Fairer cards: weight the draw so difficulty is more consistent.
- Player picks 4×4 or 5×5 before/while playing.
- Keep content maintenance dead simple (the original project goal).
- Shared links still reproduce the exact card — now including its size.

## Non-goals
- No targeted "expected marks" tuning yet (that was approach B). Weighted draw
  (approach A) only. The data format supports B as a later drop-in.
- No free center square.
- Not preserving old share-code reproducibility (see constraint).

## Constraints / accepted tradeoffs
- Served from the site only (https via Pages); runtime fetch is fine.
- **Share codes are not stable across content/weight edits.** The card is a
  seeded, weighted draw from the list; changing the list or any weight changes
  what a given seed+size produces. Accepted.
- Weights are the maintainer's subjective judgment, not data. Accepted.

## Approaches (for the weighting)
- **A — Weighted draw (chosen).** Weight = how likely a square is to be placed
  on the card. Small, clean, deterministic from the seed. Fixes the main
  unfairness.
- **B — Targeted mix.** Build each card to a recipe / expected-marks band. More
  control, more code. Deferred — same data format, so it's a later drop-in.

Chosen: **A**.

## Data format
`squares.txt` lines become `` <text> | <weight 1-5> ``:
```
Judge bangs the gavel | 2
Hello, Beautiful! | 5
Paul wearing a tweed suit        ← no "| n" still valid, defaults to 3
```
- Parser splits on the **last** `|` (no square text contains `|`). Left =
  text (trimmed); right = integer weight. Missing/blank/out-of-range → 3.
- Blank lines and `#` lines still ignored. Every un-weighted line stays valid,
  so the file is edited exactly as before plus an optional trailing number.
- The 43 reviewed squares land in `squares.txt` with their weights; the one
  straight apostrophe normalized to curly for consistency.

## The how
- **Weighted selection.** Draw N² squares (16 or 25) without replacement, each
  remaining square's chance proportional to its weight, using the existing
  seeded `mulberry32` PRNG so a seed+size reproduces the exact card. (Replaces
  today's uniform Fisher–Yates `shuffle(...).slice(0,25)`.)
- **Grid size.** `N` is 4 or 5. Generalize the hardcoded 5×5 bits:
  - CSS `grid-template-columns: repeat(N, 1fr)` set from JS; the alternating
    cell tint recomputed for N (today's `nth-child(10n+…)` assumes 5 columns).
  - Render loop runs N² cells.
  - **Win check generalized** to "N in a row": every row, every column, and the
    two diagonals. (Today's checker has hand-written 5×5 indices.)
  - Minimum-squares guard becomes N² (16 or 25); 43 squares covers both.
- **UI.** A 4×4 / 5×5 toggle near the New card / Clear / Print controls.
- **Share link.** Now carries size too, e.g. `?seed=123&size=4`. Reading a link
  restores both. `size` out of range → default.

## Calls I'm making (correct me)
- **Default grid = 5×5** (today's behavior; first-time and print default).
- **URL param `size`** with value `4` or `5`.
- **Flipping the size toggle rebuilds the current seed at the new size** (same
  seed, re-drawn for N²), and the new size is written to the share link.
- **Remember the last-used size in `localStorage`** so a returning player keeps
  their preference; absent/unreadable → 5×5. (Per-viewer only; wrapped in
  try/catch.)

## Resolved during implementation
- Toggle widget: two buttons (`5×5` / `4×4`) with an `active` state, in the controls row.
- Flipping size rebuilds the current seed at the new size. Marks are no longer lost by it:
  a later change (sweep pass 2) persists marks per seed+size, so a size round-trip restores them.
- Print honours N and now also prints the seed and size on the card.

## Follow-up (sweep passes 2–5, same day)
A code sweep after the initial build added: mark persistence + copy-link + Back (pass 2);
a steeper weight^2 mapping, exclusive groups and parser warnings (pass 3); size-aware font and
accessibility (pass 4); extraction of the logic to `bingo.js` with tests, a squares lint and CI,
plus corrected footer/README claims (pass 5). See `sweep-findings-2026-11-14.md`.

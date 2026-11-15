# Design: squares list in a plain-text file

**Date:** 2026-11-14
**Status:** proposed

## Intent / why
Make adding bingo squares the single, friction-free edit. Today the list is a
JS array inside `index.html` (`var SQUARES`), so editing content means editing
code and respecting JS string syntax (commas, quotes, escaping). We want the
list to grow from 29 toward 100–200 entries over time with zero syntax burden.

## Goals
- One square per line in a plain-text file. Add a square = type a line, commit.
- No commas, quotes, or escaping. Curly quotes / apostrophes / em-dashes are
  just literal characters.
- `index.html` never needs touching to change content.

## Non-goals
- No build step, no framework, no backend. Stays a static site on GitHub Pages.
- Not preserving old share-code reproducibility (see constraint).

## Constraints / accepted tradeoffs
- **Served from the site only** (https via Pages). The page is never opened as a
  raw local file, so a runtime `fetch()` of the list is fine. (Confirmed.)
- **Share codes are not stable across content edits.** The card is a seeded
  shuffle of the list; changing the list changes what any given `?seed=`
  produces. Accepted — casual fan game.

## Approaches considered
- **A — plain-text file, one line per square (chosen).** Lowest-friction edit,
  no syntax, scales cleanly.
- **B — `squares.json` array.** Splits the data out too, but hand-editing JSON
  reintroduces commas/quotes/escaping — easy to break with one stray character.
- **C — keep inline, just tidy.** Zero new moving parts, but still editing
  inside a code file under JS string rules.

Chosen: **A**.

## The how
- **New file:** `squares.txt` at repo root, alongside `index.html`. One square
  per line. The current 29 squares migrate into it verbatim.
- **Parsing rules:** split on newlines; trim each line; drop blank lines; drop
  lines beginning with `#` (comment/grouping lines, so the file stays organized
  at 200 entries). Everything else is a square, as-is.
- **Loading:** on page load, `fetch('squares.txt')`, parse, then run the
  existing seed → shuffle → render flow. The init path becomes async; the card
  renders once the list is in.
- **Guard (new):** a card needs 25 squares. If the file fails to load or yields
  fewer than 25 squares, show a short message in the card area instead of a
  grid with blank cells (today's `slice(0,25)` would silently produce
  `undefined` cells). This is the one correctness change beyond moving the data.
- **Unchanged:** seed handling, `mulberry32` PRNG, Fisher–Yates shuffle, marks,
  win detection, print, share-code UI.

## Left to the builder
- Exact wording of the load-failure / too-few-squares message.
- Whether to show a brief loading state (the fetch is tiny and same-origin, so
  likely imperceptible — builder's call).
- The footer currently says "offline"; it still reads fine, leave as-is.

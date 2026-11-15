# Perry Mason Bingo

A single-page, play-along bingo game for watching *Perry Mason* episodes. Start an
episode, then tap a square whenever it happens on screen. Four or five in a row — across,
down, or corner to corner — wins.

Intended to live at a URL on **gamesmarts.net**.

## What it does

- **Choose your board.** Play **5×5** (five in a row) or **4×4** (four in a row); the 4×4
  game finishes faster, a better fit for one episode. The toggle sits next to the controls.
- **Weighted, varied cards.** Each card draws from a pool of squares (16 for 4×4, 25 for
  5×5). Squares carry a 1–5 weight — common events (weight 5) land on most cards, rare ones
  (weight 1) are occasional — so cards vary and stay winnable. Mutually-exclusive squares
  can share a group (e.g. the four murder-method squares) so at most one lands on a card.
- **Play on screen.** Tap squares to mark them; the page detects a win (any row, column, or
  diagonal) and shows a banner. Your marks and grid-size choice are saved in your browser, so
  reloading mid-episode keeps your progress.
- **Print option.** "Print this card" renders the current card clean, in black-and-white,
  including its seed and size so a paper card can be reproduced.
- **Shareable cards.** Every card is defined by a seed and size in the URL
  (`?seed=NNN&size=N`). Use "Copy link to this card" and send it — the recipient gets the
  identical board.
- **No backend, no analytics.** Everything runs in the browser; the only thing stored is your
  grid-size preference and current marks, in this browser only. Web fonts are loaded from
  Google Fonts.

## Files

- `index.html` — the page: HTML, CSS, and the UI script.
- `bingo.js` — the pure game logic (seeded PRNG, weighted draw, squares parser, win check),
  shared by the page and the tests.
- `squares.txt` — the square list (see below). Required at runtime; fetched on load.
- `test/bingo.test.js` — unit tests (`node --test`).
- `scripts/lint-squares.js` — fails if `squares.txt` can't make a 5×5 card or has bad lines.
- `.github/workflows/ci.yml` — runs the tests and the lint on push / PR.

## Editing the squares

Squares live in `squares.txt`, one per line:

```
<text> | <weight 1-5> | <group>
```

- The weight and group are optional. No weight defaults to 3.
- `weight` 5 = happens almost every episode (easy mark); 1 = rare.
- `group` (optional third field) marks mutually-exclusive squares; at most one square per
  group lands on a card.
- Blank lines and lines starting with `#` are ignored.
- Keep at least 25 real squares (a 5×5 card needs 25). The more squares, the more cards vary.

Adding a square is a one-line edit — no code changes. Note that editing the list or any weight
changes which card a given `?seed=` produces, so previously shared links won't reproduce their
old cards.

## Develop / test

```sh
python3 -m http.server 8000   # then open http://localhost:8000
node --test                   # unit tests
node scripts/lint-squares.js  # content lint
```

## Deploy

Static page — serve the repo from any web host / CDN (it's deployed via GitHub Pages). No
build step. `squares.txt` is fetched with `cache: no-cache`, but `index.html` is served with
the host's normal cache lifetime; when you change the `squares.txt` *format* (not just add a
line), deploy at a quiet time so a visitor holding an old cached `index.html` doesn't briefly
run the old parser against the new file.

## A note on copyright

This is a non-commercial fan tribute. It is not affiliated with, endorsed by, or connected
to the owners of *Perry Mason*; character names belong to their respective rights holders.
Kept free and unbranded on purpose.

# Perry Mason Bingo

A single-page, play-along bingo game for watching *Perry Mason* episodes. Start an
episode, then tap a square whenever it happens on screen. Five in a row — across, down,
or corner to corner — wins.

Intended to live at a URL on **gamesmarts.net**.

## What it does

- **Infinite cards.** Each card draws 25 of a 29-square pool and arranges them randomly,
  so cards don't repeat.
- **Play on screen.** Tap squares to mark them; the page auto-detects a win (any row,
  column, or diagonal) and shows a banner. This is the main way to play — no printing needed.
- **Print option.** "Print this card" renders the current card clean, in black-and-white,
  for anyone who wants paper. Hit "New card" and print again for more.
- **Shareable cards.** Every card has a seed carried in the URL (`?seed=NNN`). Send someone
  that link and they get the identical card, so you can race the same board.
- **No backend, no tracking.** Everything runs in the browser. Nothing is stored or sent
  anywhere.

## Files

- `index.html` — the whole game (HTML + CSS + JS in one file). The only file the site needs.

## Deploy

It's a static page. Serve `index.html` from any web host / CDN / object store. No build step.

Local check:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Editing the squares

The square pool is the `SQUARES` array near the top of the `<script>` block in `index.html`.
Add or change lines there; the grid uses 25 of whatever is in the array, so keep at least 25
entries. (More than 25 is what makes cards vary.)

## A note on copyright

This is a non-commercial fan tribute. It is not affiliated with, endorsed by, or connected
to the owners of *Perry Mason*; character names belong to their respective rights holders.
Kept free and unbranded on purpose.

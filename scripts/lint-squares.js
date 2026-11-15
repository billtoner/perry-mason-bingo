#!/usr/bin/env node
"use strict";
// Fail the build if squares.txt can't make a 5x5 card or has malformed lines.
const fs = require("fs");
const path = require("path");
const { parseSquares, capacity } = require("../bingo.js");

const file = path.join(__dirname, "..", "squares.txt");
const text = fs.readFileSync(file, "utf8");
const warnings = [];
const squares = parseSquares(text, (m) => warnings.push(m));

// A square longer than this clips inside a 5x5 cell at phone widths (sweep finding 1).
const MAX_LEN = 42;

let ok = true;
// Capacity, not raw count: a group contributes at most one square per card.
const cap = capacity(squares);
if (cap < 25) {
  console.error(`FAIL: squares.txt yields capacity ${cap} (ungrouped + distinct groups) from ${squares.length} squares; need at least 25 for a 5x5 card.`);
  ok = false;
}
// A group with a single member is almost certainly a typo (acts like a plain square).
const groupCounts = Object.create(null);
squares.forEach((s) => { if (s.group) groupCounts[s.group] = (groupCounts[s.group] || 0) + 1; });
Object.keys(groupCounts).forEach((g) => {
  if (groupCounts[g] < 2) {
    console.error(`FAIL: group "${g}" has only ${groupCounts[g]} member; a group needs 2+ (likely a typo).`);
    ok = false;
  }
});
squares.forEach((s) => {
  if (s.text.length > MAX_LEN) {
    console.error(`FAIL: square "${s.text}" is ${s.text.length} chars; keep squares to ${MAX_LEN} or fewer so they fit a 5x5 cell.`);
    ok = false;
  }
});
warnings.forEach((w) => { console.error("FAIL: " + w); ok = false; });

if (ok) {
  console.log(`squares.txt OK: ${squares.length} squares, no warnings.`);
  process.exit(0);
}
process.exit(1);

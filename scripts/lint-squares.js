#!/usr/bin/env node
"use strict";
// Fail the build if squares.txt can't make a 5x5 card or has malformed lines.
const fs = require("fs");
const path = require("path");
const { parseSquares } = require("../bingo.js");

const file = path.join(__dirname, "..", "squares.txt");
const text = fs.readFileSync(file, "utf8");
const warnings = [];
const squares = parseSquares(text, (m) => warnings.push(m));

let ok = true;
if (squares.length < 25) {
  console.error(`FAIL: squares.txt has ${squares.length} squares; need at least 25 for a 5x5 card.`);
  ok = false;
}
warnings.forEach((w) => { console.error("FAIL: " + w); ok = false; });

if (ok) {
  console.log(`squares.txt OK: ${squares.length} squares, no warnings.`);
  process.exit(0);
}
process.exit(1);

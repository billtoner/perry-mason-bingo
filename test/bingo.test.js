"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const {
  mulberry32, weightedPick, parseSquares, capacity, cardFingerprint,
  readSeed, readSize, encodeMarks, decodeMarks, parseLast, hasWin,
} = require("../bingo.js");

function synth(n) {
  const a = [];
  for (let i = 0; i < n; i++) a.push({ text: "S" + i, weight: (i % 5) + 1, group: "" });
  return a;
}
const texts = (card) => card.map((p) => p.text);

test("mulberry32 is deterministic and pinned to a known value", () => {
  const a = mulberry32(42), b = mulberry32(42);
  const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
  assert.deepStrictEqual(seqA, seqB);
  assert.ok(seqA[0] >= 0 && seqA[0] < 1);
  // Known-answer: if this changes, every previously shared link produces a different card.
  assert.strictEqual(mulberry32(42)(), 0.6011037519201636);
});

test("golden card: a fixed synthetic list + seed + size yields a fixed board", () => {
  // Synthetic list (not squares.txt) so content edits never break this; pins the whole draw order.
  const items = synth(30);
  const card = texts(weightedPick(items, 16, mulberry32(7)));
  assert.deepStrictEqual(card, [
    "S1", "S3", "S29", "S19", "S14", "S12", "S13", "S8",
    "S18", "S24", "S6", "S4", "S25", "S17", "S9", "S21",
  ]);
});

test("weightedPick biases toward heavier squares (fails if weights are ignored)", () => {
  const items = [
    { text: "H1", weight: 5, group: "" }, { text: "H2", weight: 5, group: "" },
    { text: "L1", weight: 1, group: "" }, { text: "L2", weight: 1, group: "" },
  ];
  for (let i = 0; i < 40; i++) items.push({ text: "M" + i, weight: 3, group: "" });
  let heavy = 0, light = 0;
  for (let s = 0; s < 4000; s++) {
    const names = texts(weightedPick(items, 16, mulberry32(s)));
    heavy += names.filter((t) => t[0] === "H").length;
    light += names.filter((t) => t[0] === "L").length;
  }
  // With the w^2 mapping a weight-5 square is 25x a weight-1; even over a partial draw it dominates.
  // A flat eff() (return 1) makes heavy ~= light and trips this.
  assert.ok(heavy > light * 3, `expected heavy >> light, got heavy=${heavy} light=${light}`);
});

test("weightedPick reproduces the same card for a seed+size, differs across seeds", () => {
  const items = synth(30);
  for (const N of [4, 5]) {
    const total = N * N;
    const c1 = texts(weightedPick(items, total, mulberry32(123)));
    const c2 = texts(weightedPick(items, total, mulberry32(123)));
    assert.strictEqual(c1.length, total);
    assert.deepStrictEqual(c1, c2, `N=${N} not deterministic`);
    const c3 = texts(weightedPick(items, total, mulberry32(999)));
    assert.notDeepStrictEqual(c1, c3, `N=${N} identical across different seeds`);
  }
});

test("weightedPick keeps at most one square per group, fills the card, and does draw grouped squares", () => {
  const items = [
    { text: "A", weight: 3, group: "m" }, { text: "B", weight: 3, group: "m" },
    { text: "C", weight: 3, group: "m" }, { text: "D", weight: 2, group: "m" },
  ];
  for (let i = 5; i < 60; i++) items.push({ text: "F" + i, weight: 3, group: "" });
  let everDrewGroup = false;
  for (let s = 0; s < 500; s++) {
    const card = weightedPick(items, 25, mulberry32(s));
    assert.strictEqual(card.length, 25, `seed ${s} did not fill the card`);
    const inM = card.filter((p) => p.group === "m").length;
    assert.ok(inM <= 1, `seed ${s} drew ${inM} group-m squares`);
    if (inM === 1) everDrewGroup = true;
  }
  // guard against a bug that silently never draws grouped squares (the old test passed if so)
  assert.ok(everDrewGroup, "a grouped square was never drawn across 500 seeds");
});

test("weightedPick returns at most the pool size, and stops when a group exhausts it", () => {
  assert.strictEqual(weightedPick(synth(5), 25, mulberry32(1)).length, 5);
  const allOneGroup = [
    { text: "A", weight: 3, group: "m" }, { text: "B", weight: 3, group: "m" },
    { text: "C", weight: 3, group: "m" },
  ];
  assert.strictEqual(weightedPick(allOneGroup, 16, mulberry32(1)).length, 1);
});

test("capacity counts a group once and ungrouped squares individually", () => {
  assert.strictEqual(capacity([{ group: "" }, { group: "" }, { group: "m" }, { group: "m" }, { group: "n" }]), 4);
  assert.strictEqual(capacity([]), 0);
});

test("cardFingerprint is stable, order-sensitive and text-sensitive", () => {
  const a = [{ text: "A" }, { text: "B" }];
  assert.strictEqual(cardFingerprint(a), cardFingerprint([{ text: "A" }, { text: "B" }]));
  assert.notStrictEqual(cardFingerprint(a), cardFingerprint([{ text: "B" }, { text: "A" }]));
  assert.notStrictEqual(cardFingerprint(a), cardFingerprint([{ text: "A" }, { text: "C" }]));
});

test("readSeed / readSize parse URLs, with seed 0 present and out-of-range size absent", () => {
  assert.strictEqual(readSeed("?seed=0", ""), 0);          // 0 is a real seed
  assert.strictEqual(readSeed("?seed=42&size=4", ""), 42);
  assert.strictEqual(readSeed("", "#7"), 7);
  assert.strictEqual(readSeed("?size=5", "#nope"), null);
  assert.strictEqual(readSeed("", ""), null);
  assert.strictEqual(readSize("?size=4"), 4);
  assert.strictEqual(readSize("?size=5"), 5);
  assert.strictEqual(readSize("?size=3"), 0);              // out of range
  assert.strictEqual(readSize("?seed=1"), 0);              // absent
});

test("encodeMarks / decodeMarks round-trip; decode rejects wrong length or non-string", () => {
  const m = [true, false, true, true];
  assert.strictEqual(encodeMarks(m), "1011");
  assert.deepStrictEqual(decodeMarks("1011", 4), m);
  assert.strictEqual(decodeMarks("101", 4), null);
  assert.strictEqual(decodeMarks(null, 4), null);
});

test("parseLast reads a <seed>_<size> token and rejects junk", () => {
  assert.deepStrictEqual(parseLast("1234_5"), { seed: 1234, size: 5 });
  assert.deepStrictEqual(parseLast("0_4"), { seed: 0, size: 4 });     // seed 0 is valid
  assert.strictEqual(parseLast("1234_3"), null);                       // size out of range
  assert.strictEqual(parseLast("abc_5"), null);
  assert.strictEqual(parseLast("5"), null);
  assert.strictEqual(parseLast(null), null);
  assert.strictEqual(parseLast(""), null);
});

test("parseSquares handles weights, groups, blanks, bad input and duplicates", () => {
  const warn = [];
  const out = parseSquares(
    [
      "# a comment",
      "",
      "Good | 4",
      "Defaulted",
      "Grouped | 2 | murder",
      "Bad weight | 9",
      "Float | 3.9",
      "Good | 2",            // duplicate text
    ].join("\n"),
    (m) => warn.push(m)
  );
  assert.deepStrictEqual(out, [
    { text: "Good", weight: 4, group: "" },
    { text: "Defaulted", weight: 3, group: "" },
    { text: "Grouped", weight: 2, group: "murder" },
    { text: "Bad weight", weight: 3, group: "" },
    { text: "Float", weight: 3, group: "" },
  ]);
  assert.strictEqual(warn.length, 3); // bad weight, float, duplicate
  assert.ok(warn.some((w) => /invalid weight "9"/.test(w)));
  assert.ok(warn.some((w) => /duplicate square "Good"/.test(w)));
});

test("parseSquares: null-proto names, case-insensitive dups, empty text and extra fields", () => {
  const warn = [];
  const out = parseSquares(
    [
      "Constructor | 3",      // must NOT be a phantom duplicate (Object.prototype)
      "__proto__",            // same
      "| 3",                  // weight but no text -> warn + skip
      "B | 2 | G | extra",    // extra field -> warn; group lower-cased
      "Dup",
      "dup",                  // case-insensitive duplicate -> warn + skip
    ].join("\n"),
    (m) => warn.push(m)
  );
  assert.deepStrictEqual(out, [
    { text: "Constructor", weight: 3, group: "" },
    { text: "__proto__", weight: 3, group: "" },
    { text: "B", weight: 2, group: "g" },
    { text: "Dup", weight: 3, group: "" },
  ]);
  assert.ok(warn.some((w) => /no square text/.test(w)));
  assert.ok(warn.some((w) => /extra field/.test(w)));
  assert.ok(warn.some((w) => /duplicate square "dup"/.test(w)));
});

test("hasWin detects every line at N=4 and N=5 and no false positives", () => {
  for (const N of [4, 5]) {
    const total = N * N;
    const blank = () => new Array(total).fill(false);
    assert.ok(!hasWin(blank(), N), `empty board won at N=${N}`);

    for (let r = 0; r < N; r++) {
      const m = blank(); for (let c = 0; c < N; c++) m[r * N + c] = true;
      assert.ok(hasWin(m, N), `row ${r} missed at N=${N}`);
    }
    for (let c = 0; c < N; c++) {
      const m = blank(); for (let r = 0; r < N; r++) m[r * N + c] = true;
      assert.ok(hasWin(m, N), `col ${c} missed at N=${N}`);
    }
    const d = blank(); for (let k = 0; k < N; k++) d[k * N + k] = true;
    assert.ok(hasWin(d, N), `diagonal missed at N=${N}`);
    const a = blank(); for (let k = 0; k < N; k++) a[k * N + (N - 1 - k)] = true;
    assert.ok(hasWin(a, N), `anti-diagonal missed at N=${N}`);

    // near-miss: a full row minus one cell
    const nm = blank(); for (let c = 0; c < N - 1; c++) nm[c] = true;
    assert.ok(!hasWin(nm, N), `near-miss won at N=${N}`);
  }
});

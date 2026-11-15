"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { mulberry32, weightedPick, parseSquares, hasWin } = require("../bingo.js");

function synth(n) {
  const a = [];
  for (let i = 0; i < n; i++) a.push({ text: "S" + i, weight: (i % 5) + 1, group: "" });
  return a;
}
const texts = (card) => card.map((p) => p.text);

test("mulberry32 is deterministic for a seed", () => {
  const a = mulberry32(42), b = mulberry32(42);
  const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
  assert.deepStrictEqual(seqA, seqB);
  assert.ok(seqA[0] >= 0 && seqA[0] < 1);
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

test("weightedPick keeps at most one square per group", () => {
  const items = [
    { text: "A", weight: 3, group: "m" }, { text: "B", weight: 3, group: "m" },
    { text: "C", weight: 3, group: "m" }, { text: "D", weight: 2, group: "m" },
  ];
  for (let i = 5; i < 60; i++) items.push({ text: "F" + i, weight: 3, group: "" });
  for (let s = 0; s < 500; s++) {
    const card = weightedPick(items, 25, mulberry32(s));
    const inM = card.filter((p) => p.group === "m").length;
    assert.ok(inM <= 1, `seed ${s} drew ${inM} group-m squares`);
  }
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

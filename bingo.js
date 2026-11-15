// Pure game logic for Perry Mason Bingo, shared by the page (window.Bingo) and
// the Node test suite (module.exports). No DOM, no globals beyond the export.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Bingo = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // seeded PRNG so a share code reproduces the exact card
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // steeper-than-linear weight so rare squares really stay rare
  function eff(w) { return w * w; }

  // weighted sampling without replacement; at most one square per group; deterministic per rnd
  function weightedPick(items, count, rnd) {
    var pool = items.slice(), out = [], i, total, r, acc, chosen, picked;
    for (var n = 0; n < count && pool.length; n++) {
      total = 0;
      for (i = 0; i < pool.length; i++) total += eff(pool[i].weight);
      r = rnd() * total; acc = 0; chosen = pool.length - 1;
      for (i = 0; i < pool.length; i++) {
        acc += eff(pool[i].weight);
        if (r < acc) { chosen = i; break; }
      }
      picked = pool[chosen];
      out.push(picked);
      if (picked.group) {
        pool = pool.filter(function (p) { return p.group !== picked.group; });
      } else {
        pool.splice(chosen, 1);
      }
    }
    return out;
  }

  // parse "text | weight 1-5 | group" lines; blank/# lines ignored; onWarn(msg) for problems
  function parseSquares(text, onWarn) {
    onWarn = onWarn || function (m) { if (typeof console !== "undefined") console.warn(m); };
    // null-prototype map so a square named "constructor" / "__proto__" isn't a phantom duplicate
    var out = [], seen = Object.create(null);
    text.split(/\r?\n/).forEach(function (line, idx) {
      var t = line.trim();
      if (!t || t.charAt(0) === "#") return;
      var parts = t.split("|").map(function (p) { return p.trim(); });
      var sq = parts[0], group = (parts[2] || "").toLowerCase(), w = 3;  // groups are case-insensitive
      if (parts.length >= 2 && parts[1] !== "") {
        var n = parseInt(parts[1], 10);
        if (String(n) === parts[1] && n >= 1 && n <= 5) w = n;
        else onWarn("squares.txt line " + (idx + 1) + ": invalid weight \"" + parts[1] + "\" — using 3");
      }
      if (parts.length > 3) onWarn("squares.txt line " + (idx + 1) + ": extra field(s) after group ignored");
      if (!sq) { onWarn("squares.txt line " + (idx + 1) + ": no square text — skipping"); return; }
      var key = sq.toLowerCase();
      if (seen[key]) { onWarn("squares.txt line " + (idx + 1) + ": duplicate square \"" + sq + "\" — skipping"); return; }
      seen[key] = true;
      out.push({ text: sq, weight: w, group: group });
    });
    return out;
  }

  // effective capacity of a pool: a group contributes at most one square per card
  function capacity(items) {
    var groups = Object.create(null), gcount = 0, ungrouped = 0, i, g;
    for (i = 0; i < items.length; i++) {
      g = items[i].group;
      if (g) { if (!groups[g]) { groups[g] = true; gcount++; } }
      else ungrouped++;
    }
    return ungrouped + gcount;
  }

  // stable fingerprint of a drawn card (its square texts), for keying saved marks to THIS card —
  // so a weight/group/list edit that changes the draw can't restore marks onto different squares
  function cardFingerprint(picks) {
    var s = 0, str = picks.map(function (p) { return p.text; }).join("\u0001"), i;
    for (i = 0; i < str.length; i++) s = (Math.imul(31, s) + str.charCodeAt(i)) | 0;
    return (s >>> 0).toString(36);
  }

  // --- Pure URL / marks helpers (shared with the page; kept here so they can be tested) ---

  // seed from a query string (?seed=N, N may be 0) or a #N hash; null when absent
  function readSeed(search, hash) {
    search = search || ""; hash = hash || "";
    var m = search.match(/[?&]seed=(\d+)/);
    if (m) return parseInt(m[1], 10);          // 0 is a valid seed, not "absent"
    var h = hash.replace(/^#/, "");
    if (/^\d+$/.test(h)) return parseInt(h, 10);
    return null;
  }
  // size from a query string: 4 or 5, else 0 (absent / out of range)
  function readSize(search) {
    search = search || "";
    var m = search.match(/[?&]size=(\d+)/);
    if (m) { var n = parseInt(m[1], 10); if (n === 4 || n === 5) return n; }
    return 0;
  }
  function encodeMarks(marks) { return marks.map(function (b) { return b ? "1" : "0"; }).join(""); }
  function decodeMarks(str, total) {
    if (typeof str === "string" && str.length === total) return str.split("").map(function (ch) { return ch === "1"; });
    return null;
  }

  // true when marks (length N*N) contain a full row, column or diagonal
  function hasWin(m, N) {
    var r, c, k, ok;
    for (r = 0; r < N; r++) { ok = true; for (c = 0; c < N; c++) if (!m[r * N + c]) { ok = false; break; } if (ok) return true; }
    for (c = 0; c < N; c++) { ok = true; for (r = 0; r < N; r++) if (!m[r * N + c]) { ok = false; break; } if (ok) return true; }
    ok = true; for (k = 0; k < N; k++) if (!m[k * N + k]) { ok = false; break; } if (ok) return true;
    ok = true; for (k = 0; k < N; k++) if (!m[k * N + (N - 1 - k)]) { ok = false; break; } if (ok) return true;
    return false;
  }

  return {
    mulberry32: mulberry32, eff: eff, weightedPick: weightedPick,
    parseSquares: parseSquares, capacity: capacity, cardFingerprint: cardFingerprint,
    readSeed: readSeed, readSize: readSize, encodeMarks: encodeMarks, decodeMarks: decodeMarks,
    hasWin: hasWin
  };
});

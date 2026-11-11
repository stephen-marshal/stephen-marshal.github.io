// Unit tests for the pure game engine. Each test name cites the SPEC requirement it covers.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine.js";

const ALL = (v) => ({ n1: v, n2: v, n3: v, n4: v, n5: v });

test("REQ-SCORE-7 seeded RNG is deterministic and in [0,1)", () => {
  const a = E.createRng(42), b = E.createRng(42), c = E.createRng(7);
  const xs = Array.from({ length: 50 }, () => a());
  const ys = Array.from({ length: 50 }, () => b());
  assert.deepEqual(xs, ys);
  assert.notDeepEqual(xs, Array.from({ length: 50 }, () => c()));
  for (const x of xs) assert.ok(x >= 0 && x < 1);
});

test("REQ-SCORE-7 shuffle is a seeded permutation and does not mutate input", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const copy = [...input];
  const s1 = E.shuffle(input, E.createRng(1));
  const s2 = E.shuffle(input, E.createRng(1));
  assert.deepEqual(input, copy);
  assert.deepEqual(s1, s2);
  assert.deepEqual([...s1].sort((x, y) => x - y), copy);
});

test("REQ-SCORE-1 REQ-SCORE-2 ratio score is an integer 0..100", () => {
  assert.equal(E.ratioScore(0, 6), 0);
  assert.equal(E.ratioScore(6, 6), 100);
  assert.equal(E.ratioScore(4, 6), 67);
  assert.equal(E.ratioScore(0, 0), 0);
  assert.ok(Number.isInteger(E.ratioScore(1, 3)));
});

test("REQ-SCORE-3 night 3 mixes cards (75%) and Ten Faces (25%)", () => {
  assert.equal(E.nightThreeScore(8, 8, "stopped"), 100);
  assert.equal(E.nightThreeScore(8, 8, "burnout"), 83); // 75 + 7.5 -> 83
  assert.equal(E.nightThreeScore(0, 8, "stopped"), 25);
  assert.equal(E.nightThreeScore(0, 8, "burnout"), 8);
});

test("REQ-SCORE-4 dance score caps between 0 and 100", () => {
  assert.equal(E.danceScore({ shown: 18, caught: 18, thoughtsTapped: 0 }), 100);
  assert.equal(E.danceScore({ shown: 18, caught: 9, thoughtsTapped: 0 }), 50);
  assert.equal(E.danceScore({ shown: 18, caught: 18, thoughtsTapped: 2 }), 84);
  assert.equal(E.danceScore({ shown: 18, caught: 1, thoughtsTapped: 9 }), 0);
  assert.equal(E.danceScore({ shown: 0, caught: 0, thoughtsTapped: 0 }), 0);
});

test("REQ-SCORE-5 courage is the rounded mean of five nights, null if incomplete", () => {
  assert.equal(E.courage({ n1: 100, n2: 80, n3: 60, n4: 40, n5: 21 }), 60);
  assert.equal(E.courage({ n1: 100 }), null);
});

test("REQ-SCORE-6 archetype is the weakest night; ties go to the earlier night", () => {
  assert.equal(E.archetype({ n1: 90, n2: 40, n3: 70, n4: 85, n5: 99 }), "n2");
  assert.equal(E.archetype({ n1: 50, n2: 90, n3: 50, n4: 85, n5: 99 }), "n1");
  assert.equal(E.archetype({ n1: 90, n2: 90, n3: 90, n4: 90, n5: 10 }), "n5");
});

test("REQ-SCORE-6 all nights >= 80 gives The Light Traveller", () => {
  assert.equal(E.archetype(ALL(80)), "light");
  assert.equal(E.archetype({ ...ALL(100), n4: 79 }), "n4");
});

test("REQ-N4-1 judging replies tilt the line, encouragement levels it", () => {
  let t = 0;
  t = E.tiltAfter(t, "praise");   assert.ok(t > 0);
  const up = t;
  t = E.tiltAfter(t, "encourage"); assert.ok(Math.abs(t) < Math.abs(up));
  t = E.tiltAfter(0, "defer");     assert.ok(t < 0);
  for (let i = 0; i < 20; i++) t = E.tiltAfter(t, "rebuke");
  assert.ok(t <= E.MAX_TILT);
  let z = 30;
  for (let i = 0; i < 10; i++) z = E.tiltAfter(z, "encourage");
  assert.equal(z, 0);
});

test("REQ-N3-2 faces drain over time, never below 0, and refill to 100", () => {
  const rates = E.faceRates(E.createRng(3));
  assert.equal(rates.length, 10);
  let levels = Array(10).fill(100);
  levels = E.facesStep(levels, 1000, rates);
  assert.ok(levels.every((l) => l < 100));
  levels = E.facesStep(levels, 60000, rates);
  assert.ok(levels.every((l) => l === 0));
  assert.equal(E.refill(levels, 4)[4], 100);
  // one person cannot keep up: total drain per second exceeds what ~3 refills/s can restore
  const drainPerSec = rates.reduce((a, r) => a + r, 0);
  assert.ok(drainPerSec > 300);
});

test("REQ-N3-2 settled faces follow the 1-2-7 split", () => {
  const moods = E.settleFaces(E.createRng(9));
  assert.equal(moods.length, 10);
  assert.equal(moods.filter((m) => m === "frown").length, 1);
  assert.equal(moods.filter((m) => m === "smile").length, 2);
  assert.equal(moods.filter((m) => m === "neutral").length, 7);
});

test("REQ-N1-1 REQ-N2-1 REQ-N3-1 REQ-N4-1 isCorrect understands each night's answer shape", () => {
  assert.equal(E.isCorrect("n1", { correct: 2 }, 2), true);
  assert.equal(E.isCorrect("n1", { correct: 2 }, 0), false);
  assert.equal(E.isCorrect("n2", { bin: "mask" }, "mask"), true);
  assert.equal(E.isCorrect("n2", { bin: "mask" }, "fuel"), false);
  assert.equal(E.isCorrect("n3", { owner: "theirs" }, "theirs"), true);
  assert.equal(E.isCorrect("n3", { owner: "theirs" }, "mine"), false);
  const n4 = { options: [{ kind: "praise" }, { kind: "encourage" }] };
  assert.equal(E.isCorrect("n4", n4, 1), true);
  assert.equal(E.isCorrect("n4", n4, 0), false);
});

test("REQ-FLOW-2 hash routes parse, and anything unknown goes home", () => {
  assert.deepEqual(E.parseRoute(""), { name: "home" });
  assert.deepEqual(E.parseRoute("#/"), { name: "home" });
  assert.deepEqual(E.parseRoute("#/night/3"), { name: "night", n: 3 });
  assert.deepEqual(E.parseRoute("#/end"), { name: "end" });
  assert.deepEqual(E.parseRoute("#/night/9"), { name: "home" });
  assert.deepEqual(E.parseRoute("#/night/x"), { name: "home" });
  assert.deepEqual(E.parseRoute("#/nope"), { name: "home" });
});

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}
const throwing = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };

test("REQ-SAVE-1 progress keeps the best score per night and round-trips", () => {
  const s = memoryStorage();
  let p = E.loadProgress(s);
  assert.deepEqual(p, {});
  p = E.saveNightScore(s, p, "n2", 70);
  p = E.saveNightScore(s, p, "n2", 40);
  assert.equal(p.n2, 70);
  assert.deepEqual(E.loadProgress(s), { n2: 70 });
});

test("REQ-SAVE-1 REQ-FLOW-4 blocked, missing or corrupt storage never throws", () => {
  assert.deepEqual(E.loadProgress(throwing), {});
  assert.deepEqual(E.loadProgress(null), {});
  const p = E.saveNightScore(throwing, {}, "n1", 50);
  assert.equal(p.n1, 50);
  const bad = memoryStorage();
  bad.setItem(E.STORAGE_KEY, "{not json");
  assert.deepEqual(E.loadProgress(bad), {});
  bad.setItem(E.STORAGE_KEY, JSON.stringify({ n1: 999, n7: 5, n2: "x" }));
  assert.deepEqual(E.loadProgress(bad), { n1: 100 });
  assert.equal(E.allDone({ n1: 1, n2: 1, n3: 1, n4: 1 }), false);
  assert.equal(E.allDone(ALL(0)), true);
});

test("REQ-SHARE-1 REQ-FLOW-5 share text has archetype, courage and URL, nothing personal", () => {
  const p = E.profile({ n1: 90, n2: 85, n3: 40, n4: 80, n5: 95 });
  assert.equal(p.archetype, "n3");
  assert.equal(p.courage, 78);
  const txt = E.shareText({ courage: p.courage, name: "The Approval Collector" }, "https://example.org/g/");
  assert.match(txt, /The Approval Collector/);
  assert.match(txt, /78/);
  assert.match(txt, /https:\/\/example\.org\/g\//);
  assert.doesNotMatch(txt, /@/);
});

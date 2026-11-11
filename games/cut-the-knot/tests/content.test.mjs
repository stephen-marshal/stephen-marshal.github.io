// Content checks: shape, minimum counts, phone-friendly lengths, safety and originality.
import { test } from "node:test";
import assert from "node:assert/strict";
import { NIGHTS, META, ARCHETYPES, FINALE } from "../src/content.js";

const byId = Object.fromEntries(NIGHTS.map((n) => [n.id, n]));

/** Every string anywhere inside a value, with its path, for blanket checks. */
function strings(value, path = "") {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k));
  return [];
}
const ALL_TEXT = strings({ NIGHTS, META, ARCHETYPES, FINALE });

test("REQ-CONTENT-2 there are five nights, in order, each with the full frame", () => {
  assert.deepEqual(NIGHTS.map((n) => n.id), ["n1", "n2", "n3", "n4", "n5"]);
  for (const n of NIGHTS) {
    for (const key of ["title", "short", "idea", "howTo", "objection", "reply", "takeaway", "tryToday"]) {
      assert.equal(typeof n[key], "string", `${n.id}.${key}`);
      assert.ok(n[key].trim().length > 0, `${n.id}.${key} empty`);
    }
  }
});

test("REQ-CONTENT-3 REQ-N1-1 night 1: >= 6 excuses, 3 options, exactly one correct, with reframe", () => {
  const items = byId.n1.items;
  assert.ok(items.length >= 6);
  for (const it of items) {
    assert.equal(it.options.length, 3, it.id);
    assert.ok(Number.isInteger(it.correct) && it.correct >= 0 && it.correct < 3, it.id);
    assert.ok(it.excuse && it.reframe, it.id);
  }
  // the correct answer should not always sit in the same slot
  assert.ok(new Set(items.map((i) => i.correct)).size > 1);
});

test("REQ-CONTENT-3 REQ-N2-1 night 2: >= 9 statements, >= 2 per bin, each with why", () => {
  const n2 = byId.n2;
  assert.deepEqual(n2.bins.map((b) => b.id), ["fuel", "excuse", "mask"]);
  assert.ok(n2.items.length >= 9);
  for (const bin of ["fuel", "excuse", "mask"])
    assert.ok(n2.items.filter((i) => i.bin === bin).length >= 2, bin);
  for (const it of n2.items) assert.ok(it.text && it.why, it.id);
});

test("REQ-CONTENT-3 REQ-N3-1 night 3: >= 8 cards, >= 3 mine and >= 3 theirs, each names who lives with it", () => {
  const items = byId.n3.items;
  assert.ok(items.length >= 8);
  assert.ok(items.filter((i) => i.owner === "mine").length >= 3);
  assert.ok(items.filter((i) => i.owner === "theirs").length >= 3);
  for (const it of items) {
    assert.ok(["mine", "theirs"].includes(it.owner), it.id);
    assert.ok(it.bearer && it.why, it.id);
  }
});

test("REQ-N3-2 night 3 has the Ten Faces copy including the 1-2-7 lesson", () => {
  const f = byId.n3.faces;
  for (const key of ["intro", "stopLabel", "stopped", "burnout", "lesson"]) assert.ok(f[key], key);
  assert.match(f.lesson, /one/i);
  assert.match(f.lesson, /two/i);
  assert.match(f.lesson, /seven/i);
});

test("REQ-CONTENT-3 REQ-N4-1 night 4: >= 5 scenes, 4 options, exactly one encourage", () => {
  const kinds = new Set(["praise", "rebuke", "intervene", "defer", "encourage"]);
  const items = byId.n4.items;
  assert.ok(items.length >= 5);
  for (const it of items) {
    assert.equal(it.options.length, 4, it.id);
    assert.equal(it.options.filter((o) => o.kind === "encourage").length, 1, it.id);
    for (const o of it.options) {
      assert.ok(kinds.has(o.kind), `${it.id} ${o.kind}`);
      assert.ok(o.text && o.note, it.id);
    }
  }
});

test("REQ-CONTENT-3 REQ-N5-1 REQ-N5-2 night 5: >= 8 thoughts covering past and future, plus the reveal", () => {
  const t = byId.n5.thoughts;
  assert.ok(t.length >= 8);
  assert.ok(t.some((x) => x.when === "past"));
  assert.ok(t.some((x) => x.when === "future"));
  for (const x of t) assert.ok(["past", "future"].includes(x.when), x.id);
  assert.ok(byId.n5.reveal);
});

test("REQ-CONTENT-4 item ids are unique across the whole game", () => {
  const ids = [
    ...byId.n1.items, ...byId.n2.items, ...byId.n3.items, ...byId.n4.items, ...byId.n5.thoughts,
  ].map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate id");
  for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
});

test("REQ-CONTENT-5 every option and feedback line fits a phone (<= 240 chars)", () => {
  const SHORT = /(options|text|why|reframe|note|excuse|scene|bearer)(\b|\.|\[|$)/;
  for (const [path, s] of ALL_TEXT) {
    if (SHORT.test(path)) assert.ok(s.length <= 240, `${path} is ${s.length} chars`);
  }
});

test("REQ-SCORE-6 archetype copy exists for every outcome", () => {
  const expected = {
    n1: "The Archivist", n2: "The Comparer", n3: "The Approval Collector",
    n4: "The Judge", n5: "The Summit Chaser", light: "The Light Traveller",
  };
  for (const [k, name] of Object.entries(expected)) {
    assert.equal(ARCHETYPES[k].name, name);
    assert.ok(ARCHETYPES[k].line);
  }
  assert.ok(FINALE.star && FINALE.title);
});

test("REQ-ORIG-1 no long quotations and no book character labels", () => {
  const quote = /[“"]([^”"]+)[”"]/g;
  for (const [path, s] of ALL_TEXT) {
    for (const m of s.matchAll(quote)) {
      const words = m[1].trim().split(/\s+/).length;
      assert.ok(words <= 12, `${path}: quotation of ${words} words`);
    }
    assert.doesNotMatch(s, /\b(YOUTH|PHILOSOPHER)\s*:/, path);
  }
});

test("REQ-ORIG-1 credit names the book and authors and says it is not affiliated", () => {
  assert.match(META.credit, /The Courage to Be Disliked/);
  assert.match(META.credit, /Kishimi/);
  assert.match(META.credit, /Koga/);
  assert.match(META.credit, /not affiliated/i);
});

test("REQ-SAFE-1 disclaimer exists and content avoids the safety deny-list", () => {
  assert.match(META.disclaimer, /not therapy/i);
  const deny = /\b(suicid\w*|self[- ]harm|wrist|abus\w*|trauma\w*|rape|kill\w*)\b/i;
  for (const [path, s] of ALL_TEXT) assert.doesNotMatch(s, deny, path);
});

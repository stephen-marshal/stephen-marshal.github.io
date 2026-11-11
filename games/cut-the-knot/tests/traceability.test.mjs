// REQ-HARNESS-3: SPEC.md and the tests must agree, in both directions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const GAME = join(dirname(fileURLToPath(import.meta.url)), "..");
const ID = /REQ-[A-Z0-9]+-\d+/g;

const specIds = new Set(readFileSync(join(GAME, "SPEC.md"), "utf8").match(ID));
const testSources = [
  ...readdirSync(join(GAME, "tests")).filter((f) => f.endsWith(".mjs")).map((f) => join(GAME, "tests", f)),
  join(GAME, "tools", "e2e.mjs"),
].map((p) => [p, readFileSync(p, "utf8")]);
const cited = new Set(testSources.flatMap(([, s]) => s.match(ID) ?? []));

test("REQ-HARNESS-3 every requirement in SPEC.md is cited by a test", () => {
  const missing = [...specIds].filter((id) => !cited.has(id));
  assert.deepEqual(missing, [], `untested requirements: ${missing.join(", ")}`);
});

test("REQ-HARNESS-3 tests only cite requirements that exist in SPEC.md", () => {
  const unknown = [...cited].filter((id) => !specIds.has(id));
  assert.deepEqual(unknown, [], `unknown requirement ids: ${unknown.join(", ")}`);
});

test("REQ-HARNESS-3 the spec has a sensible number of requirements", () => {
  assert.ok(specIds.size >= 25, `only ${specIds.size} requirements found`);
});

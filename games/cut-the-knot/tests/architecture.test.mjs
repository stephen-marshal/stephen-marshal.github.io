// Architecture and quality rules, enforced mechanically rather than by review.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const GAME = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(GAME, "..", "..");
const read = (p) => readFileSync(join(GAME, p), "utf8");
/** Strip // and /* *\/ comments so rules apply to code, not to explanations. */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

test("REQ-ARCH-1 engine.js is pure: no DOM, window, storage globals or timers", () => {
  const src = code(read("src/engine.js"));
  for (const banned of ["document", "window", "localStorage", "sessionStorage", "setTimeout",
    "setInterval", "requestAnimationFrame", "navigator", "fetch(", "Math.random"]) {
    assert.ok(!src.includes(banned), `engine.js must not use ${banned}`);
  }
});

test("REQ-ARCH-1 only ui.js touches the DOM", () => {
  for (const f of ["src/engine.js", "src/content.js"]) {
    assert.ok(!code(read(f)).includes("document."), `${f} touches the DOM`);
  }
  assert.ok(read("src/ui.js").includes("document."));
});

test("REQ-CONTENT-1 content.js is data only (no functions, no imports)", () => {
  const src = code(read("src/content.js"));
  assert.doesNotMatch(src, /\bfunction\b|=>|\bimport\b|\bclass\b/);
});

test("REQ-A11Y-1 page shell has lang, title, description, viewport and a live region", () => {
  const html = read("index.html");
  assert.match(html, /<html lang="en"/);
  assert.match(html, /<title>[^<]{3,}<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]{20,}"/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<noscript>/);
});

test("REQ-A11Y-1 every action is a real button (keyboard reachable) and keys are handled", () => {
  const ui = read("src/ui.js");
  assert.doesNotMatch(ui, /<div[^>]*onclick/i);
  assert.match(ui, /ArrowLeft/);
  assert.match(ui, /ArrowRight/);
  assert.match(ui, /" "|'Space'|"Space"|Enter/);
});

test("REQ-A11Y-2 reduced motion is respected in CSS and in the game loop", () => {
  assert.match(read("game.css"), /prefers-reduced-motion:\s*reduce/);
  assert.match(read("src/ui.js"), /prefers-reduced-motion/);
});

test("REQ-A11Y-3 uses the shared site theme and tokens", () => {
  const html = read("index.html");
  assert.match(html, /\.\.\/\.\.\/theme\.js/);
  assert.match(html, /\.\.\/\.\.\/style\.css/);
  const css = read("game.css");
  assert.match(css, /var\(--bg\)|var\(--surface\)/);
  assert.match(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /\[data-theme="dark"\]/);
});

test("REQ-PERF-1 no third-party scripts and the game stays under 150 KB", () => {
  const html = read("index.html");
  for (const m of html.matchAll(/<script[^>]*src="([^"]+)"/g)) {
    assert.doesNotMatch(m[1], /^https?:\/\//, `third-party script ${m[1]}`);
  }
  const files = ["index.html", "game.css", ...readdirSync(join(GAME, "src")).map((f) => `src/${f}`)];
  const total = files.reduce((sum, f) => sum + statSync(join(GAME, f)).size, 0);
  assert.ok(total <= 150 * 1024, `game is ${total} bytes`);
});

test("REQ-HARNESS-1 tests need nothing but Node built-ins", () => {
  const dir = join(GAME, "tests");
  for (const f of readdirSync(dir)) {
    const src = readFileSync(join(dir, f), "utf8");
    for (const m of src.matchAll(/^import .* from "([^"]+)"/gm)) {
      assert.ok(m[1].startsWith("node:") || m[1].startsWith("."), `${f} imports ${m[1]}`);
    }
  }
  assert.ok(!existsSync(join(GAME, "package.json")), "no package.json: zero dependencies");
});

test("REQ-HARNESS-2 CI runs the fast checks and the e2e play-through", () => {
  const wf = join(REPO, ".github", "workflows", "cut-the-knot.yml");
  assert.ok(existsSync(wf), "workflow missing");
  const y = readFileSync(wf, "utf8");
  assert.match(y, /games\/cut-the-knot\/\*\*/);
  assert.match(y, /node --test "games\/cut-the-knot\/tests\/\*\.test\.mjs"/);
  assert.match(y, /node games\/cut-the-knot\/tools\/e2e\.mjs/);
  assert.match(y, /pull_request/);
});

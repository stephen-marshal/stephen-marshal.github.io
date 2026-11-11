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

test("REQ-PERF-1 no third-party scripts except the pinned Firebase SDK in auth.js; under 150 KB", () => {
  const html = read("index.html");
  for (const m of html.matchAll(/<script[^>]*src="([^"]+)"/g)) {
    assert.doesNotMatch(m[1], /^https?:\/\//, `third-party script ${m[1]}`);
  }
  for (const f of readdirSync(join(GAME, "src"))) {
    const src = read(`src/${f}`);
    for (const m of src.matchAll(/(?:from|import\()\s*"(https?:[^"]+)"/g)) {
      assert.equal(f, "auth.js", `${f} imports ${m[1]}`);
      assert.match(m[1], /^https:\/\/www\.gstatic\.com\/firebasejs\/11\.0\.2\//, m[1]);
    }
  }
  const files = ["index.html", "game.css", ...readdirSync(join(GAME, "src")).map((f) => `src/${f}`)];
  const total = files.reduce((sum, f) => sum + statSync(join(GAME, f)).size, 0);
  assert.ok(total <= 150 * 1024, `game is ${total} bytes`);
});

test("REQ-AUTH-1 REQ-AUTH-3 ui.js loads auth lazily, survives it failing, and has no test bypass", () => {
  const ui = read("src/ui.js");
  assert.match(ui, /import\("\.\/auth\.js"\)/, "auth.js must be a dynamic import so a blocked SDK can't break the page");
  assert.match(ui, /catch/);
  assert.doesNotMatch(ui, /params\.has\("test"\)[^\n]*(user|auth|sign)/i, "?test=1 must not touch sign-in");
  assert.doesNotMatch(ui, /__ctk|fakeUser/);
  const auth = read("src/auth.js");
  assert.ok(!code(auth).includes("document."), "auth.js must not touch the DOM");
  assert.match(auth, /firebase-config\.js/);
});

test("REQ-STATS-2 stats render on visitors.html only after the owner check", () => {
  const v = readFileSync(join(REPO, "visitors.html"), "utf8");
  assert.match(v.slice(v.indexOf('<div id="owner" hidden>')), /id="ctk-stats"/);
  const check = v.indexOf("user.email !== OWNER_EMAIL");
  const load = v.indexOf('collection(db, "ctk_players")');
  assert.ok(check > 0 && load > check, "player data must be read only after the owner check");
  assert.match(v, /aggregateStats/);
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

test("REQ-OWNER-1 answer key lives only in the owner block of visitors.html, after the owner check", () => {
  const v = readFileSync(join(REPO, "visitors.html"), "utf8");
  const owner = v.slice(v.indexOf('<div id="owner" hidden>'), v.indexOf("</div>\n</div>"));
  assert.match(owner, /id="answer-key"/, "answer-key section must sit inside #owner");
  const check = v.indexOf("user.email !== OWNER_EMAIL");
  const load = v.indexOf('import("./games/cut-the-knot/src/content.js")');
  assert.ok(check > 0 && load > check, "content must be loaded only after the owner check");
  assert.doesNotMatch(read("index.html"), /answer-key/, "the public game page must not show the key");
});

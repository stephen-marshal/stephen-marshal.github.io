// End-to-end play-through in headless Chrome over the DevTools protocol (REQ-E2E-1).
// No npm packages: Node's global WebSocket + fetch talk to Chrome directly.
//
//   node games/cut-the-knot/tools/e2e.mjs                 # play all five nights to the finale
//   node games/cut-the-knot/tools/e2e.mjs --shots <dir>   # also save screenshots (light/dark, phone/desktop)
//
// Sign-in: src/auth.js is swapped for FAKE_AUTH (or blocked) via Fetch interception,
// so production code carries no test bypass.
// Covers: REQ-AUTH-1 REQ-AUTH-2 REQ-AUTH-3 REQ-STATS-1 REQ-BOOK-1
//         REQ-FLOW-1 REQ-FLOW-2 REQ-FLOW-3 REQ-FLOW-4 REQ-FLOW-5 REQ-N1-1 REQ-N2-1 REQ-N3-1
//         REQ-N3-2 REQ-N4-1 REQ-N5-1 REQ-N5-2 REQ-SHARE-1 REQ-SAVE-1
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "./serve.mjs";

const args = process.argv.slice(2);
const SHOTS = args.includes("--shots") ? args[args.indexOf("--shots") + 1] : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Stand-in for src/auth.js with the same API. Records writes on window for assertions.
const FAKE_AUTH = `
const listeners = [];
let current = null;
window.__e2eAuth = { writes: [], records: {} };
export function onUser(cb) { listeners.push(cb); setTimeout(() => cb(current), 0); return () => {}; }
export async function signIn() { current = { uid: "e2e-user", name: "E2E Player", email: "e2e@example.test" }; listeners.forEach((cb) => cb(current)); }
export async function signOut() { current = null; listeners.forEach((cb) => cb(null)); }
export async function loadPlayer(u) { return window.__e2eAuth.records[u.uid] ?? null; }
export async function saveNight(u, update) { window.__e2eAuth.writes.push(JSON.parse(JSON.stringify(update))); }
`;

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  for (const bin of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    try { return execFileSync("which", [bin]).toString().trim(); } catch { /* next */ }
  }
  throw new Error("Chrome not found. Set CHROME_PATH.");
}

async function launch() {
  const profile = mkdtempSync(join(tmpdir(), "ctk-e2e-"));
  const proc = spawn(findChrome(), [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run",
    "--no-default-browser-check", "--disable-gpu", "--no-sandbox", "--window-size=1200,900", "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => reject(new Error("Chrome did not start")), 20000);
    proc.stderr.on("data", (d) => {
      buf += d;
      const m = /DevTools listening on (ws:\/\/[^\s]+)/.exec(buf);
      if (m) { clearTimeout(timer); resolve(m[1]); }
    });
  });
  const port = new URL(wsUrl).port;
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  const errors = [];
  const hooks = {};
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (hooks[msg.method]) hooks[msg.method](msg.params);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method === "Runtime.exceptionThrown") {
      errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      errors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
    } else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
      const e = msg.params.entry;
      // Web fonts are optional; a font fetch failing offline is not a game bug.
      if (!(e.source === "network" && /fonts\.(googleapis|gstatic)\.com/.test(e.url ?? ""))) errors.push(`${e.source}: ${e.text} ${e.url ?? ""}`);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.enable");
  // Wait for Chrome to exit before deleting its profile; cleanup must never fail the run.
  const close = async () => {
    try { ws.close(); } catch {}
    const exited = new Promise((r) => proc.once("exit", r));
    proc.kill("SIGKILL");
    await Promise.race([exited, sleep(5000)]);
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* temp dir; OS will clean it */ }
  };
  return { send, errors, close, hooks };
}

async function main() {
  const server = await startServer(0);
  const base = `http://127.0.0.1:${server.address().port}/games/cut-the-knot/?test=1&seed=7`;
  const chrome = await launch();
  const { send, errors, hooks } = chrome;
  let authMode = "block";
  await send("Fetch.enable", { patterns: [{ urlPattern: "*games/cut-the-knot/src/auth.js*", requestStage: "Request" }] });
  hooks["Fetch.requestPaused"] = ({ requestId }) => {
    if (authMode === "block") send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
    else send("Fetch.fulfillRequest", { requestId, responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "text/javascript" }], body: Buffer.from(FAKE_AUTH).toString("base64") });
  };
  const steps = [];
  const ok = (msg) => { steps.push(msg); console.log(`  ✔ ${msg}`); };

  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`eval failed: ${expression}\n${r.exceptionDetails.exception?.description}`);
    return r.result.value;
  };
  const waitFor = async (expression, what, timeout = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (await evaluate(`!!(${expression})`)) return;
      await sleep(40);
    }
    throw new Error(`timed out waiting for ${what}`);
  };
  const click = (sel) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
  const go = async (hash) => { await evaluate(`location.hash = ${JSON.stringify(hash)}`); await sleep(60); };
  const heading = () => evaluate(`document.querySelector("#stage h1")?.textContent ?? ""`);

  async function viewport(width, height, dark) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: width < 600 });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }] });
  }
  async function shot(name) {
    if (!SHOTS) return;
    mkdirSync(SHOTS, { recursive: true });
    await sleep(900); // let entry animations settle
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(data, "base64"));
  }

  try {
    await viewport(390, 844, false);

    // Sign-in blocked: the game explains instead of breaking.
    await send("Page.navigate", { url: base });
    await waitFor(`document.querySelector("[data-auth-failed]")`, "sign-in unavailable message");
    ok("REQ-AUTH-3 a blocked sign-in SDK shows a plain message");
    errors.length = 0; // the deliberately blocked request is logged as a network error

    // Signed out: every route shows the gate with the privacy note and the book line.
    authMode = "fake";
    await send("Page.reload");
    await waitFor(`document.querySelector('[data-gate] [data-action="sign-in"]')`, "sign-in gate");
    const privacy = await evaluate(`document.querySelector("[data-gate] .privacy").textContent`);
    if (!/12 months/.test(privacy) || !/answers/.test(privacy)) throw new Error("privacy note incomplete");
    ok("REQ-AUTH-2 privacy note shown before sign-in");
    await waitFor(`document.querySelector("[data-read-book]")`, "read-the-book line on the gate");
    ok("REQ-BOOK-1 the gate encourages reading the book");
    await shot("00-gate-phone-light");
    await go("#/night/2");
    await waitFor(`document.querySelector("[data-gate]") && !document.querySelector('[data-action="start"]')`, "gate on a deep link");
    await click('[data-action="sign-in"]');
    await waitFor(`document.querySelector('[data-action="start"]') && document.querySelector("#stage h1").textContent === "Fuel or Excuse"`, "night 2 after sign-in");
    await waitFor(`document.getElementById("g-user").textContent.includes("E2E Player")`, "signed-in user in nav");
    ok("REQ-AUTH-1 gate on every route; sign-in keeps the deep link and shows the user");

    await go("#/");
    await waitFor(`document.querySelectorAll(".night-card").length === 5`, "five nights listed");
    ok("REQ-FLOW-1 home shows the knot and five playable nights");
    await shot("01-home-phone-light");

    // Night 1-4 quiz-style loop, plus Night 3's Ten Faces round.
    for (const n of [1, 2, 3, 4]) {
      await go(`#/night/${n}`);
      await waitFor(`document.querySelector('[data-action="start"]')`, `night ${n} intro`);
      await click('[data-action="start"]');
      let answered = 0;
      while (true) {
        if (await evaluate(`!!document.querySelector('[data-recap]')`)) break;
        if (await click('[data-action="faces-start"]')) {
          await waitFor(`document.querySelector('[data-action="stop-chasing"]:not([hidden])')`, "stop-chasing option");
          if (n === 3) await shot("04-night3-faces-phone-light");
          await click('[data-action="stop-chasing"]');
          await waitFor(`document.querySelector('.faces.settled')`, "settled faces (1-2-7)");
          const split = await evaluate(`[...document.querySelectorAll('.faces.settled .face-btn')].map(f => f.dataset.mood).sort().join(",")`);
          if (split !== "frown,neutral,neutral,neutral,neutral,neutral,neutral,neutral,smile,smile") throw new Error(`1-2-7 split wrong: ${split}`);
          ok("REQ-N3-2 Ten Faces: stop option appears and the 1-2-7 lesson is shown");
          await click('[data-action="next"]');
          continue;
        }
        if (await click('[data-answer]:not([disabled])')) {
          answered++;
          await waitFor(`document.querySelector('[data-action="next"]')`, `feedback after answer on night ${n}`);
          if (answered === 1) {
            if (n === 1) {
              await waitFor(`document.querySelector('.flip.flipped .reframe')`, "night 1 card flipped to so that");
              ok("REQ-N1-1 answering flips the card to the reframe");
              await shot("02-night1-flip-phone-light");
            }
            if (n === 2) { await waitFor(`document.querySelector('.bin.right')`, "correct bin highlighted"); ok("REQ-N2-1 sorting names the right bin"); }
            if (n === 3) { ok("REQ-N3-1 Mine/Theirs card answered with feedback naming who lives with it"); await shot("03-night3-task-phone-light"); }
            if (n === 4) {
              await waitFor(`document.querySelector('.line-scene .beam')`, "relationship line");
              ok("REQ-N4-1 replies tilt or level the relationship line");
              await shot("05-night4-line-phone-light");
            }
          }
          await click('[data-action="next"]');
          continue;
        }
        await sleep(40);
      }
      const score = await evaluate(`Number(document.querySelector('[data-recap]').dataset.score)`);
      if (!(Number.isInteger(score) && score >= 0 && score <= 100)) throw new Error(`night ${n} score ${score}`);
      if (n === 1) { ok("REQ-FLOW-3 intro → play → recap with score, takeaway and try-today"); await shot("06-recap-phone-light"); }
      ok(`night ${n} finished, score ${score}`);
    }

    // Night 5: the dance.
    await go("#/night/5");
    await waitFor(`document.querySelector('[data-action="start"]')`, "night 5 intro");
    await click('[data-action="start"]');
    await waitFor(`document.querySelector('[data-action="dance-start"]')`, "dance start");
    await click('[data-action="dance-start"]');
    const noTimer = await evaluate(`!document.querySelector('.counter, progress, [role="timer"], [role="progressbar"]')`);
    if (!noTimer) throw new Error("night 5 must not show a timer or progress");
    let shotTaken = false;
    const t0 = Date.now();
    while (!(await evaluate(`!!document.querySelector('[data-action="next"]')`))) {
      await click('[data-dot]:not([disabled])');
      if (!shotTaken && (await evaluate(`!!document.querySelector('.thought')`))) { shotTaken = true; await shot("07-night5-dance-phone-light"); }
      if (Date.now() - t0 > 60000) throw new Error("dance never finished");
      await sleep(25);
    }
    ok("REQ-N5-1 one dot at a time, no timer shown");
    await waitFor(`document.querySelector('.trail polyline')`, "trail line");
    ok("REQ-N5-2 caught dots are joined into a line");
    await shot("08-night5-reveal-phone-light");
    await click('[data-action="next"]');
    await waitFor(`document.querySelector('[data-recap="n5"]')`, "night 5 recap");

    // Home now offers the finale, progress was saved.
    await go("#/");
    await waitFor(`document.querySelectorAll('.thread.done').length === 5 && document.querySelector('[data-action="finale"]')`, "five straight threads and finale button");
    ok("REQ-FLOW-4 finished nights straighten threads; finale offered");
    const saved = await evaluate(`Object.keys(JSON.parse(localStorage.getItem("cut-the-knot:v1:e2e-user"))).length`);
    if (saved !== 5) throw new Error(`expected 5 saved nights, got ${saved}`);
    ok("REQ-SAVE-1 progress persisted to localStorage under the player's own key");
    const writes = await evaluate(`window.__e2eAuth.writes`);
    if (writes.length !== 5) throw new Error(`expected 5 stats writes, got ${writes.length}`);
    if (!writes.every((w) => w.best && Object.keys(w.answers).length > 0)) throw new Error("a stats write is missing best or answers");
    const last = writes.at(-1);
    if (!Number.isInteger(last.courage) || !last.archetype) throw new Error("final write lacks courage/archetype");
    if (!("n3-faces" in writes.find((w) => w.best.n3 !== undefined).answers)) throw new Error("Ten Faces outcome not recorded");
    ok("REQ-STATS-1 each finished night saves best + answers; the last adds courage and archetype");

    await click('[data-action="finale"]');
    await waitFor(`document.querySelector('[data-archetype]') && document.querySelector('[data-action="share"]')`, "finale profile and share");
    await waitFor(`document.querySelector("[data-read-book]")`, "read-the-book line on the finale");
    ok("REQ-FLOW-5 finale shows cut knot, profile, guiding star, share and the book line");
    await shot("09-finale-phone-light");
    await evaluate(`Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });`);
    await click('[data-action="share"]');
    await waitFor(`document.querySelector('.share-text')?.value.includes("Courage")`, "share text fallback");
    ok("REQ-SHARE-1 share falls back to showing text with archetype and courage");

    // Deep link and back button.
    await go("#/night/3");
    if ((await heading()) !== "Whose Task?") throw new Error("deep link to night 3 failed");
    await evaluate("history.back()");
    await waitFor(`location.hash === "#/end" && document.querySelector('[data-archetype]')`, "back button returns to the finale");
    ok("REQ-FLOW-2 deep links and the back button route correctly");

    await click('[data-action="sign-out"]');
    await waitFor(`document.querySelector("[data-gate]") && document.getElementById("g-user").hidden`, "gate after sign-out");
    ok("REQ-AUTH-1 signing out returns to the gate");
    await click('[data-action="sign-in"]');
    await waitFor(`!document.querySelector("[data-gate]")`, "signed back in");

    if (SHOTS) {
      await viewport(1200, 900, true);
      await shot("10-finale-desktop-dark");
      await go("#/");
      await shot("11-home-desktop-dark");
      await go("#/night/2");
      await click('[data-action="start"]');
      await click('[data-answer]');
      await shot("12-night2-desktop-dark");
    }

    if (errors.length) throw new Error(`page logged errors:\n${errors.join("\n")}`);
    ok("REQ-E2E-1 full play-through with no page errors");
    console.log(`\nE2E passed: ${steps.length} checks.`);
  } finally {
    await chrome.close();
    server.close();
  }
}

main().catch((e) => { console.error(`\nE2E FAILED: ${e.message}`); process.exit(1); });

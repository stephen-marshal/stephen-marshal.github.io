// UI for Cut the Knot: rendering, input, timers, routing and storage.
// The only module that touches the DOM (REQ-ARCH-1). Logic lives in engine.js; words in content.js.
import { META, NIGHTS, ARCHETYPES, FINALE } from "./content.js";
import * as E from "./engine.js";

/* ---------- environment ---------- */
const params = new URLSearchParams(location.search);
const SPEED = params.has("test") ? 6 : 1; // ?test=1 speeds up timers for the e2e run
const SEED = Number(params.get("seed")) || Date.now() % 2147483647;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ms = (x) => Math.max(1, Math.round(x / SPEED));

const stage = document.getElementById("stage");
const live = document.getElementById("live");
const foot = document.getElementById("foot");
const userBar = document.getElementById("g-user");

const storage = (() => {
  try {
    const s = window.localStorage;
    s.setItem("__storage_probe", "1");
    s.removeItem("__storage_probe");
    return s;
  } catch {
    return null; // private mode or blocked: play without saving (REQ-SAVE-1)
  }
})();
// Sign-in state (REQ-AUTH-1): undefined = still loading, null = signed out.
let user;
let A = null; // the auth module, loaded lazily (REQ-AUTH-3)
let authFailed = false;
let pKey = E.STORAGE_KEY;
let progress = {};
const rng = E.createRng(SEED);
let lastCompleted = null;

/* ---------- lifecycle: every timer or loop is disposed on screen change ---------- */
let disposers = [];
let keyHandler = null;
function later(fn, delay) {
  const id = setTimeout(fn, ms(delay));
  disposers.push(() => clearTimeout(id));
}
function loop(fn) {
  let id;
  const tick = (t) => { if (fn(t) !== false) id = requestAnimationFrame(tick); };
  id = requestAnimationFrame(tick);
  disposers.push(() => cancelAnimationFrame(id));
}
function cleanup() {
  disposers.forEach((d) => d());
  disposers = [];
  keyHandler = null;
}

/* ---------- tiny element builders ---------- */
function build(el, attrs, kids) {
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "class") el.setAttribute("class", v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const h = (tag, attrs, ...kids) => build(document.createElement(tag), attrs, kids);
const SVGNS = "http://www.w3.org/2000/svg";
const s = (tag, attrs, ...kids) => build(document.createElementNS(SVGNS, tag), attrs, kids);

function show(...nodes) {
  stage.replaceChildren(...nodes);
  const heading = stage.querySelector("h1");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
  window.scrollTo(0, 0);
}
function announce(msg) {
  live.textContent = "";
  setTimeout(() => { live.textContent = msg; }, 40);
}
const button = (label, attrs = {}) => h("button", { type: "button", class: "g-btn", ...attrs }, label);

/* ---------- the knot ---------- */
const THREAD_Y = [40, 74, 108, 142, 176];
function tangled(i) {
  const y = THREAD_Y[i];
  const k = i % 2 ? 1 : -1;
  const o = i * 11;
  return `M16 ${y} C 130 ${y}, 170 ${108 + k * 66}, 228 ${108 - k * 22} S 286 ${52 + o}, 300 ${108 + k * 34} S 334 ${168 - o}, 372 ${108 - k * 44} S 470 ${y}, 584 ${y}`;
}
function knot({ cut = false } = {}) {
  const paths = NIGHTS.map((n, i) => {
    const y = THREAD_Y[i];
    const done = Number.isFinite(progress[n.id]);
    const cls = `thread t${i + 1}${done ? " done" : ""}${lastCompleted === n.id ? " draw" : ""}`;
    if (cut) {
      return [s("path", { class: `${cls} cut-l`, d: `M16 ${y} L 288 ${y}` }), s("path", { class: `${cls} cut-r`, d: `M312 ${y} L 584 ${y}` })];
    }
    return s("path", { class: cls, d: done ? `M16 ${y} L 584 ${y}` : tangled(i), pathLength: "1" });
  });
  const label = cut ? "The five threads lie straight and the knot has been cut."
    : `A knot of five threads. ${Object.keys(progress).length} of 5 straightened.`;
  return h("figure", { class: `knot${cut ? " is-cut" : ""}` },
    s("svg", { viewBox: "0 0 600 216", role: "img", "aria-label": label },
      paths,
      cut ? s("path", { class: "blade", d: "M300 6 L 300 210" }) : null));
}

/* ---------- screens ---------- */
function renderHome() {
  const done = Object.keys(progress).length;
  const list = h("ol", { class: "nights" },
    NIGHTS.map((n, i) => h("li", {},
      h("a", { class: `night-card t${i + 1}${Number.isFinite(progress[n.id]) ? " done" : ""}`, href: `#/night/${n.num}` },
        h("span", { class: "meta" }, `Night ${n.num}`, Number.isFinite(progress[n.id]) ? ` · best ${progress[n.id]}` : ""),
        h("strong", {}, n.title),
        h("span", {}, n.short)))));
  show(
    h("header", { class: "g-hero" },
      h("p", { class: "eyebrow" }, "A five-night mind game"),
      h("h1", {}, META.title),
      h("p", { class: "role" }, META.subtitle)),
    knot(),
    h("p", { class: "knot-caption" }, META.knotIntro),
    h("section", { class: "g-section" },
      h("h2", {}, "The five nights"),
      list,
      E.allDone(progress)
        ? h("p", { class: "cta" }, h("a", { class: "g-btn primary", href: "#/end", "data-action": "finale" }, "Cut the knot →"))
        : h("p", { class: "muted" }, done
          ? `${done} of 5 threads straightened. Finish all five to cut the knot.`
          : "About a minute per night, six minutes in all. Play in order, or jump around."),
      done ? h("p", {}, h("button", { type: "button", class: "linkbtn", onclick: resetProgress }, "Reset progress on this device")) : null));
  lastCompleted = null;
}

function resetProgress() {
  progress = {};
  try { storage?.removeItem(pKey); } catch { /* ignore */ }
  announce("Progress reset.");
  renderHome();
}

function renderNight(n) {
  const night = NIGHTS[n - 1];
  const body = h("div", { class: "g-body" });
  show(
    h("header", { class: "g-head" },
      h("p", { class: "eyebrow" }, `Night ${n} of 5`),
      h("h1", {}, night.title)),
    body);
  intro();

  function intro() {
    cleanup();
    body.replaceChildren(h("section", { class: "g-card intro" },
      h("h2", {}, "The idea"), h("p", {}, night.idea),
      h("h2", {}, "How to play"), h("p", {}, night.howTo),
      h("div", { class: "objection" },
        h("p", {}, h("b", {}, "You might be thinking: "), night.objection),
        h("p", {}, night.reply)),
      button("Begin", { class: "g-btn primary", "data-action": "start", onclick: play })));
  }
  function play() {
    cleanup();
    PLAYERS[night.id](body, night, finish);
  }
  function finish(score, answers = {}) {
    cleanup();
    progress = E.saveNightScore(storage, progress, night.id, score, pKey);
    lastCompleted = night.id;
    if (A && user) {
      // REQ-STATS-1: a failed save never blocks play.
      A.saveNight(user, E.nightUpdate({ nightId: night.id, answers, progress }))
        .catch((e) => console.warn("Couldn't save to stats:", e?.message));
    }
    recap(score);
  }
  function recap(score) {
    const verdict = score >= 80 ? "Lightly done. This thread is nearly straight."
      : score >= 50 ? "A few tangles loosened." : "Still a little tangled. That's an honest place to start.";
    const big = h("span", { class: "big" }, "0");
    const nextNight = NIGHTS[n];
    const actions = [];
    if (E.allDone(progress)) actions.push(h("a", { class: "g-btn primary", href: "#/end", "data-action": "finale" }, "Cut the knot →"));
    else if (nextNight && !Number.isFinite(progress[nextNight.id])) {
      actions.push(h("a", { class: "g-btn primary", href: `#/night/${n + 1}`, "data-action": "next-night" }, `Night ${n + 1}: ${nextNight.title} →`));
    } else actions.push(h("a", { class: "g-btn primary", href: "#/", "data-action": "home" }, "Back to the knot"));
    actions.push(button("Play again", { "data-action": "replay", onclick: () => renderNight(n) }));
    body.replaceChildren(h("section", { class: "g-card recap", "data-recap": night.id, "data-score": String(score) },
      h("p", { class: "eyebrow" }, `Night ${n} complete`),
      h("p", { class: "score" }, big, h("span", {}, " / 100")),
      h("p", { class: "verdict" }, verdict),
      h("h2", {}, "Takeaway"), h("p", {}, night.takeaway),
      h("h2", {}, "Try this today"), h("p", {}, night.tryToday),
      h("div", { class: "actions" }, actions)));
    countUp(big, score);
    announce(`Night ${n} complete. You scored ${score} out of 100.`);
    actions[0].focus({ preventScroll: true });
  }
}

function countUp(el, target) {
  if (REDUCED) { el.textContent = String(target); return; }
  const t0 = performance.now();
  loop((t) => {
    const p = Math.min(1, (t - t0) / 700);
    el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
    return p < 1;
  });
}

/* ---------- shared quiz pieces ---------- */
function counter(i, total) { return h("p", { class: "counter" }, `${i + 1} / ${total}`); }
function feedback(ok, verdict, ...rest) {
  const next = button("Next →", { class: "g-btn primary", "data-action": "next" });
  const box = h("div", { class: `feedback ${ok ? "ok" : "no"}` },
    h("p", { class: "verdict" }, h("b", {}, verdict)), ...rest, next);
  return { box, next };
}

/* ---------- Night 1: Cause or Goal (REQ-N1-1) ---------- */
function playN1(body, night, done) {
  const items = E.shuffle(night.items, rng);
  const answers = {};
  let i = 0, correct = 0;
  step();
  function step() {
    if (i >= items.length) return done(E.ratioScore(correct, items.length), answers);
    const it = items[i];
    let answered = false;
    const back = h("div", { class: "face back" }, h("p", { class: "label" }, "So that…"));
    const flip = h("div", { class: "flip" }, h("div", { class: "flip-inner" },
      h("div", { class: "face front" }, h("p", { class: "label" }, "Because…"), h("p", { class: "excuse" }, it.excuse)),
      back));
    const opts = it.options.map((text, k) => h("button", { type: "button", class: "opt", "data-answer": String(k), onclick: () => answer(k) },
      h("span", { class: "key", "aria-hidden": "true" }, String(k + 1)), h("span", {}, text)));
    const slot = h("div", {});
    body.replaceChildren(counter(i, items.length), flip,
      h("p", { class: "prompt" }, "What might this excuse be quietly for?"),
      h("div", { class: "opts", role: "group", "aria-label": "Possible goals" }, opts), slot);
    keyHandler = (e) => { const k = Number(e.key); if (k >= 1 && k <= 3) answer(k - 1); };
    function answer(k) {
      if (answered) return;
      answered = true;
      keyHandler = null;
      const ok = E.isCorrect("n1", it, k);
      answers[it.id] = k;
      if (ok) correct++;
      opts.forEach((b, j) => { b.disabled = true; if (j === it.correct) b.classList.add("right"); else if (j === k) b.classList.add("wrong"); });
      back.append(h("p", { class: "reframe" }, it.reframe), h("p", { class: "was" }, "Because… ", it.excuse));
      flip.classList.add("flipped");
      const { box, next } = feedback(ok, ok ? "Spot on." : "Not quite. The goal-shaped reading is highlighted.");
      next.addEventListener("click", () => { i++; step(); });
      slot.replaceChildren(box);
      announce(`${ok ? "Correct." : "Not quite."} So that: ${it.reframe}`);
      next.focus({ preventScroll: true });
    }
  }
}

/* ---------- Night 2: Fuel or Excuse (REQ-N2-1) ---------- */
function playN2(body, night, done) {
  const items = E.shuffle(night.items, rng);
  const label = Object.fromEntries(night.bins.map((b) => [b.id, b.label]));
  const answers = {};
  let i = 0, correct = 0;
  step();
  function step() {
    if (i >= items.length) return done(E.ratioScore(correct, items.length), answers);
    const it = items[i];
    let answered = false;
    const bins = night.bins.map((b, k) => h("button", { type: "button", class: `bin bin-${b.id}`, "data-answer": b.id, onclick: () => answer(b.id) },
      h("span", { class: "key", "aria-hidden": "true" }, String(k + 1)),
      h("strong", {}, b.label), h("small", {}, b.hint)));
    const slot = h("div", {});
    body.replaceChildren(counter(i, items.length),
      h("div", { class: "statement" }, h("p", {}, it.text)),
      h("div", { class: "bins", role: "group", "aria-label": "Sort into" }, bins), slot);
    keyHandler = (e) => { const k = Number(e.key); if (k >= 1 && k <= 3) answer(night.bins[k - 1].id); };
    function answer(bin) {
      if (answered) return;
      answered = true;
      keyHandler = null;
      const ok = E.isCorrect("n2", it, bin);
      answers[it.id] = bin;
      if (ok) correct++;
      bins.forEach((b) => { b.disabled = true; if (b.dataset.answer === it.bin) b.classList.add("right"); else if (b.dataset.answer === bin) b.classList.add("wrong"); });
      const { box, next } = feedback(ok, ok ? `Yes: ${label[it.bin]}.` : `That one's ${label[it.bin]}.`, h("p", {}, it.why));
      next.addEventListener("click", () => { i++; step(); });
      slot.replaceChildren(box);
      announce(`${ok ? "Correct" : "Not quite"}. ${label[it.bin]}. ${it.why}`);
      next.focus({ preventScroll: true });
    }
  }
}

/* ---------- Night 3: Whose Task? (REQ-N3-1, REQ-N3-2) ---------- */
function playN3(body, night, done) {
  const items = E.shuffle(night.items, rng);
  const answers = {};
  let i = 0, correct = 0;
  step();
  function step() {
    if (i >= items.length) return faces();
    const it = items[i];
    let answered = false;
    const card = h("div", { class: "task-card", "aria-live": "off" }, h("p", {}, it.text),
      h("span", { class: "lean lean-mine", "aria-hidden": "true" }, "Mine"),
      h("span", { class: "lean lean-theirs", "aria-hidden": "true" }, "Theirs"));
    const mine = h("button", { type: "button", class: "opt half", "data-answer": "mine", onclick: () => answer("mine") }, "← Mine");
    const theirs = h("button", { type: "button", class: "opt half", "data-answer": "theirs", onclick: () => answer("theirs") }, "Theirs →");
    const slot = h("div", {});
    body.replaceChildren(counter(i, items.length),
      h("div", { class: "deck" }, card),
      h("p", { class: "prompt" }, "Who ultimately lives with the result?"),
      h("div", { class: "opts two", role: "group", "aria-label": "Whose task" }, mine, theirs), slot);
    keyHandler = (e) => {
      if (e.key === "ArrowLeft") answer("mine");
      if (e.key === "ArrowRight") answer("theirs");
    };
    swipe(card, (dir) => answer(dir < 0 ? "mine" : "theirs"));
    function answer(owner) {
      if (answered) return;
      answered = true;
      keyHandler = null;
      const ok = E.isCorrect("n3", it, owner);
      answers[it.id] = owner;
      if (ok) correct++;
      card.classList.add(owner === "mine" ? "out-left" : "out-right");
      [mine, theirs].forEach((b) => { b.disabled = true; if (b.dataset.answer === it.owner) b.classList.add("right"); else b.classList.add("wrong"); });
      const whose = it.owner === "mine" ? "Mine." : "Theirs.";
      const { box, next } = feedback(ok, ok ? `Yes: ${whose}` : `Actually: ${whose}`,
        h("p", {}, it.bearer, " ", it.why));
      next.addEventListener("click", () => { i++; step(); });
      slot.replaceChildren(box);
      announce(`${ok ? "Correct" : "Not quite"}. ${whose} ${it.bearer} ${it.why}`);
      next.focus({ preventScroll: true });
    }
  }

  function faces() {
    cleanup();
    const f = night.faces;
    body.replaceChildren(h("section", { class: "g-card" },
      h("p", { class: "eyebrow" }, "Last round"),
      h("h2", {}, "Ten Faces"), h("p", {}, f.intro),
      button("Start", { class: "g-btn primary", "data-action": "faces-start", onclick: start })));

    function start() {
      const rates = E.faceRates(rng);
      let levels = Array(E.FACE_COUNT).fill(100);
      let ended = false;
      const btns = levels.map((_, k) => {
        const b = h("button", { type: "button", class: "face-btn", "data-face": String(k), "data-mood": "smile", "aria-label": `Person ${k + 1}: please them again`,
          onclick: () => { levels = E.refill(levels, k); } },
        faceSvg("smile"), h("span", { class: "bar" }, h("i", {})));
        return b;
      });
      const stop = button(f.stopLabel, { class: "g-btn ghost stop", "data-action": "stop-chasing", hidden: true, onclick: () => end("stopped") });
      const status = h("p", { class: "muted" }, "Keep them all smiling…");
      body.replaceChildren(h("section", { class: "g-card" }, status, h("div", { class: "faces" }, btns), stop));
      later(() => { stop.hidden = false; announce("A new option has appeared: stop chasing approval."); }, 4000);
      later(() => end("burnout"), 18000);
      let last = performance.now();
      loop((now) => {
        if (ended) return false;
        levels = E.facesStep(levels, (now - last) * SPEED, rates);
        last = now;
        btns.forEach((b, k) => {
          const l = levels[k];
          b.querySelector(".bar i").style.width = `${l}%`;
          const mood = l > 66 ? "smile" : l > 33 ? "neutral" : "frown";
          if (b.dataset.mood !== mood) { b.dataset.mood = mood; b.querySelector("svg").replaceWith(faceSvg(mood)); }
        });
        return true;
      });

      function end(outcome) {
        if (ended) return;
        ended = true;
        cleanup();
        const moods = E.settleFaces(rng);
        const next = button("Next →", { class: "g-btn primary", "data-action": "next", onclick: () => done(E.nightThreeScore(correct, items.length, outcome), { ...answers, "n3-faces": outcome }) });
        body.replaceChildren(h("section", { class: `g-card faces-end ${outcome}` },
          h("p", { class: "verdict" }, h("b", {}, f[outcome])),
          h("div", { class: "faces settled", "aria-hidden": "true" }, moods.map((m) => h("span", { class: "face-btn", "data-mood": m }, faceSvg(m)))),
          h("p", {}, f.lesson),
          next));
        announce(`${f[outcome]} ${f.lesson}`);
        next.focus({ preventScroll: true });
      }
    }
  }
}

function faceSvg(mood) {
  const mouth = { smile: "M13 24 Q20 31 27 24", neutral: "M13 26 L27 26", frown: "M13 29 Q20 22 27 29" }[mood];
  return s("svg", { viewBox: "0 0 40 40", "aria-hidden": "true" },
    s("circle", { cx: "20", cy: "20", r: "17" }),
    s("circle", { class: "eye", cx: "14", cy: "16", r: "2" }),
    s("circle", { class: "eye", cx: "26", cy: "16", r: "2" }),
    s("path", { d: mouth }));
}

function swipe(el, onSwipe) {
  let x0 = null, dx = 0;
  el.addEventListener("pointerdown", (e) => { x0 = e.clientX; dx = 0; el.setPointerCapture(e.pointerId); el.classList.add("dragging"); });
  el.addEventListener("pointermove", (e) => {
    if (x0 === null) return;
    dx = e.clientX - x0;
    el.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
    el.dataset.lean = dx < -30 ? "mine" : dx > 30 ? "theirs" : "";
  });
  const release = () => {
    if (x0 === null) return;
    x0 = null;
    el.classList.remove("dragging");
    el.style.transform = "";
    el.dataset.lean = "";
    if (Math.abs(dx) > 90) onSwipe(dx);
  };
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
}

/* ---------- Night 4: Level the Line (REQ-N4-1) ---------- */
const KIND = {
  praise: "Praise: kind, but from above.",
  rebuke: "Rebuke: from above.",
  intervene: "Taking over: from above.",
  defer: "Deferring: from below.",
  encourage: "Encouragement: side by side.",
};
function playN4(body, night, done) {
  const items = E.shuffle(night.items, rng);
  const answers = {};
  let i = 0, correct = 0, tilt = 0;
  const beam = s("g", { class: "beam" },
    s("line", { x1: "48", y1: "60", x2: "272", y2: "60" }),
    s("circle", { class: "you", cx: "48", cy: "60", r: "13" }),
    s("circle", { class: "them", cx: "272", cy: "60", r: "13" }),
    s("text", { x: "48", y: "38", "text-anchor": "middle" }, "You"),
    s("text", { x: "272", y: "38", "text-anchor": "middle" }, "Them"));
  const tiltLabel = h("p", { class: "tilt-label" }, "Level");
  const scene = h("figure", { class: "line-scene" },
    s("svg", { viewBox: "0 0 320 120", "aria-hidden": "true" },
      s("line", { class: "level-ref", x1: "20", y1: "60", x2: "300", y2: "60" }),
      s("circle", { class: "pivot", cx: "160", cy: "60", r: "4" }), beam),
    tiltLabel);
  const setTilt = () => {
    beam.style.transform = `rotate(${tilt}deg)`;
    tiltLabel.textContent = tilt === 0 ? "Level: side by side" : tilt > 0 ? `Tilted ${tilt}°: you're above them` : `Tilted ${-tilt}°: you're below them`;
    scene.dataset.level = tilt === 0 ? "yes" : "no";
  };
  setTilt();
  step();
  function step() {
    if (i >= items.length) return done(E.ratioScore(correct, items.length), answers);
    const it = items[i];
    let answered = false;
    const opts = it.options.map((o, k) => h("button", { type: "button", class: "opt", "data-answer": String(k), onclick: () => answer(k) },
      h("span", { class: "key", "aria-hidden": "true" }, String(k + 1)), h("span", {}, o.text)));
    const slot = h("div", {});
    body.replaceChildren(counter(i, items.length), scene,
      h("div", { class: "statement" }, h("p", {}, it.scene)),
      h("p", { class: "prompt" }, "What do you say?"),
      h("div", { class: "opts", role: "group", "aria-label": "Replies" }, opts), slot);
    keyHandler = (e) => { const k = Number(e.key); if (k >= 1 && k <= 4) answer(k - 1); };
    function answer(k) {
      if (answered) return;
      answered = true;
      keyHandler = null;
      const chosen = it.options[k];
      const ok = E.isCorrect("n4", it, k);
      answers[it.id] = k;
      if (ok) correct++;
      tilt = E.tiltAfter(tilt, chosen.kind);
      setTilt();
      opts.forEach((b, j) => { b.disabled = true; if (it.options[j].kind === "encourage") b.classList.add("right"); else if (j === k) b.classList.add("wrong"); });
      const { box, next } = feedback(ok, KIND[chosen.kind], h("p", {}, chosen.note));
      next.addEventListener("click", () => { i++; step(); });
      slot.replaceChildren(box);
      announce(`${KIND[chosen.kind]} ${chosen.note} ${tiltLabel.textContent}.`);
      next.focus({ preventScroll: true });
    }
  }
}

/* ---------- Night 5: Dance the Dots (REQ-N5-1, REQ-N5-2) ---------- */
function playN5(body, night, done) {
  const arena = h("div", { class: `arena${REDUCED ? " still" : ""}`, "aria-label": "The dance floor" });
  const begin = button("Begin the dance", { class: "g-btn primary", "data-action": "dance-start", onclick: start });
  arena.append(h("div", { class: "arena-start" }, h("p", {}, "One moment at a time."), begin));
  body.replaceChildren(arena, h("p", { class: "prompt muted" }, "Tap the glowing dot, or press Space. No timer, no finish line."));
  begin.focus({ preventScroll: true });

  function start() {
    const TOTAL = 18;
    const LIFE = REDUCED ? 2600 : 1600;
    const GAP = 380;
    const thoughts = E.shuffle(night.thoughts, rng);
    let shown = 0, caught = 0, tapped = 0, ti = 0, finished = false, current = null;
    const path = [];
    arena.replaceChildren();
    keyHandler = (e) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (current) catchDot(); }
    };
    spawn();
    later(thought, 1200);

    function spawn() {
      if (shown >= TOTAL) return finish();
      shown++;
      const id = shown;
      const x = 8 + rng() * 84, y = 12 + rng() * 76;
      const dot = h("button", { type: "button", class: "dot", "data-dot": "", style: `left:${x}%;top:${y}%`, "aria-label": "This moment. Catch it.", onclick: () => catchDot() });
      arena.style.setProperty("--sx", `${x}%`);
      arena.style.setProperty("--sy", `${y}%`);
      arena.append(dot);
      current = { id, dot, x, y };
      later(() => {
        if (!current || current.id !== id) return;
        current = null;
        dot.classList.add("missed");
        dot.disabled = true;
        later(() => dot.remove(), 300);
        later(spawn, GAP);
      }, LIFE);
    }
    function catchDot() {
      const c = current;
      if (!c) return;
      current = null;
      caught++;
      path.push([c.x, c.y]);
      c.dot.classList.add("caught");
      c.dot.disabled = true;
      later(() => c.dot.remove(), 350);
      later(spawn, GAP);
    }
    function thought() {
      if (finished) return;
      const t = thoughts[ti++ % thoughts.length];
      const b = h("button", { type: "button", class: `thought ${t.when}`, "data-thought": t.when, style: `top:${6 + rng() * 80}%`, tabindex: "-1",
        onclick: () => {
          tapped++;
          b.disabled = true;
          b.classList.add("chased");
          arena.classList.add("dim");
          later(() => arena.classList.remove("dim"), 700);
          announce("Lost in the dim light for a moment.");
        } },
      h("span", { class: "when" }, t.when), t.text);
      arena.append(b);
      later(() => b.remove(), 6500);
      later(thought, 2300);
    }
    function finish() {
      finished = true;
      keyHandler = null;
      arena.querySelectorAll(".thought,.dot").forEach((n) => n.remove());
      arena.classList.add("revealed");
      const pts = path.map(([x, y]) => `${x},${y}`).join(" ");
      arena.append(s("svg", { class: "trail", viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true" },
        s("polyline", { points: pts, pathLength: "1" }),
        path.map(([x, y]) => s("circle", { cx: x, cy: y, r: "1.1" }))));
      const score = E.danceScore({ shown, caught, thoughtsTapped: tapped });
      const next = button("See how you did →", { class: "g-btn primary", "data-action": "next", onclick: () => done(score, { "n5-dance": { shown, caught, thoughtsTapped: tapped } }) });
      body.replaceChildren(arena, h("div", { class: "feedback ok" },
        h("p", { class: "verdict" }, h("b", {}, `${caught} of ${shown} moments lived${tapped ? `, ${tapped} thought${tapped > 1 ? "s" : ""} chased` : ""}.`)),
        h("p", {}, night.reveal), next));
      announce(`${caught} of ${shown} moments caught. ${night.reveal}`);
      next.focus({ preventScroll: true });
    }
  }
}

const PLAYERS = { n1: playN1, n2: playN2, n3: playN3, n4: playN4, n5: playN5 };

/* ---------- Finale (REQ-FLOW-5, REQ-SHARE-1) ---------- */
function renderEnd() {
  if (!E.allDone(progress)) {
    show(h("header", { class: "g-head" }, h("p", { class: "eyebrow" }, "Not yet"), h("h1", {}, "The knot is still tied")),
      h("p", {}, "Finish all five nights first. Every thread needs straightening before it can be cut."),
      h("p", {}, h("a", { class: "g-btn primary", href: "#/" }, "Back to the knot")));
    return;
  }
  const p = E.profile(progress);
  const a = ARCHETYPES[p.archetype];
  const text = E.shareText({ name: a.name, courage: p.courage }, META.url);
  const shareSlot = h("div", {});
  show(
    h("header", { class: "g-head" }, h("p", { class: "eyebrow" }, "Finale"), h("h1", {}, FINALE.title)),
    knot({ cut: true }),
    h("p", { class: "knot-caption" }, FINALE.body),
    h("section", { class: "g-card profile", "data-archetype": p.archetype },
      h("p", { class: "eyebrow" }, "Your lifestyle, for now"),
      h("h2", {}, a.name),
      h("p", {}, a.line),
      h("div", { class: "courage", role: "meter", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(p.courage), "aria-label": "Courage" },
        h("span", {}, "Courage"), h("span", { class: "bar" }, h("i", { style: `width:${p.courage}%` })), h("b", {}, String(p.courage))),
      h("ul", { class: "scores" }, NIGHTS.map((n, i) => h("li", { class: `t${i + 1}` },
        h("a", { href: `#/night/${n.num}` }, n.title),
        h("span", { class: "bar" }, h("i", { style: `width:${progress[n.id]}%` })),
        h("span", {}, String(progress[n.id])))))),
    h("section", { class: "g-card star" },
      h("h2", {}, "Your guiding star"),
      h("p", {}, FINALE.star)),
    h("p", { class: "read-book", "data-read-book": "" }, META.readBook),
    h("div", { class: "actions" },
      button("Share your result", { class: "g-btn primary", "data-action": "share", onclick: () => share(text, shareSlot) }),
      h("a", { class: "g-btn", href: "#/" }, "Back to the knot"),
      button("Start over", { "data-action": "restart", onclick: () => { resetProgress(); location.hash = "#/"; } })),
    shareSlot);
  announce(`The knot is cut. Your lifestyle: ${a.name}. Courage ${p.courage} out of 100.`);
}

async function share(text, slot) {
  try {
    if (navigator.share) { await navigator.share({ title: META.title, text }); return; }
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(text);
    slot.replaceChildren(h("p", { class: "muted" }, "Copied to your clipboard."));
    announce("Copied to your clipboard.");
    return;
  } catch { /* fall through to showing the text */ }
  const area = h("textarea", { class: "share-text", readonly: true, rows: "3", "aria-label": "Share text" }, text);
  slot.replaceChildren(area);
  area.select();
}

/* ---------- footer, router, keys ---------- */
foot.replaceChildren(
  h("p", {}, META.credit),
  h("p", {}, META.disclaimer),
  h("p", { class: "meta" }, "Built spec-first with a test harness, no build step and no npm packages. ",
    h("a", { href: "https://github.com/stephen-marshal/stephen-marshal.github.io/tree/main/games/cut-the-knot" }, "Read the spec and code"),
    "."));

/* ---------- sign-in (REQ-AUTH-1..3) ---------- */
function renderLoading() {
  show(h("p", { class: "muted", "data-loading": "" }, "Loading…"));
}

function renderGate() {
  const action = authFailed
    ? h("p", { class: "auth-error", role: "alert", "data-auth-failed": "" }, META.authUnavailable)
    : button("Continue with Google", { class: "g-btn primary", "data-action": "sign-in", onclick: doSignIn });
  show(
    h("header", { class: "g-hero" },
      h("p", { class: "eyebrow" }, "A five-night mind game"),
      h("h1", {}, META.title),
      h("p", { class: "role" }, META.subtitle)),
    knot(),
    h("p", { class: "knot-caption" }, META.knotIntro),
    h("section", { class: "g-card gate", "data-gate": "" },
      h("h2", {}, META.signInTitle),
      h("p", {}, META.signInBody),
      action,
      h("p", { class: "privacy" }, META.privacy)),
    h("p", { class: "read-book", "data-read-book": "" }, META.readBook));
}

async function doSignIn() {
  try {
    await A.signIn();
  } catch (e) {
    if (e?.code !== "auth/popup-closed-by-user" && e?.code !== "auth/cancelled-popup-request") {
      announce("Sign-in didn't complete. Please try again.");
      console.warn("Sign-in failed:", e?.code ?? e?.message);
    }
  }
}

function renderUser() {
  if (!user) { userBar.hidden = true; userBar.replaceChildren(); return; }
  userBar.hidden = false;
  userBar.replaceChildren(
    h("span", {}, user.name || user.email), " · ",
    h("button", { type: "button", class: "linkbtn", "data-action": "sign-out", onclick: () => A.signOut() }, "Sign out"));
}

async function onUserChange(u) {
  user = u;
  if (u) {
    pKey = E.progressKey(u.uid);
    progress = E.loadProgress(storage, pKey);
    try {
      const record = await A.loadPlayer(u);
      progress = E.mergeProgress(progress, record?.best);
      try { storage?.setItem(pKey, JSON.stringify(progress)); } catch { /* storage blocked */ }
    } catch (e) {
      console.warn("Couldn't load saved progress:", e?.message);
    }
  } else {
    pKey = E.STORAGE_KEY;
    progress = {};
  }
  renderUser();
  route();
}

function route() {
  cleanup();
  if (authFailed || user === null) return renderGate();
  if (user === undefined) return renderLoading();
  const r = E.parseRoute(location.hash);
  if (r.name === "night") renderNight(r.n);
  else if (r.name === "end") renderEnd();
  else renderHome();
}
addEventListener("hashchange", route);
document.addEventListener("keydown", (e) => {
  if (!keyHandler || e.altKey || e.metaKey || e.ctrlKey) return;
  keyHandler(e);
});
document.documentElement.classList.toggle("reduced", REDUCED);
route(); // shows "Loading…" until sign-in state is known
try {
  A = await import("./auth.js");
  A.onUser(onUserChange);
} catch (e) {
  authFailed = true;
  console.warn("Sign-in unavailable:", e?.message);
  route();
}

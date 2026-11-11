// Pure game logic for Cut the Knot. No DOM, no globals, no timers (REQ-ARCH-1).
// Anything random takes an rng; anything stored takes a storage adapter.

export const NIGHT_IDS = ["n1", "n2", "n3", "n4", "n5"];
export const STORAGE_KEY = "cut-the-knot:v1";
export const MAX_TILT = 36;
export const FACE_COUNT = 10;

/** Mulberry32: tiny, fast, seeded PRNG returning floats in [0, 1). */
export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates on a copy. */
export function shuffle(items, rng) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function ratioScore(correct, total) {
  if (!total) return 0;
  return clamp(Math.round((100 * correct) / total), 0, 100);
}

export function nightThreeScore(cardsCorrect, cardsTotal, facesOutcome) {
  const cards = cardsTotal ? cardsCorrect / cardsTotal : 0;
  const faces = facesOutcome === "stopped" ? 100 : 30;
  return clamp(Math.round(75 * cards + 0.25 * faces), 0, 100);
}

export function danceScore({ shown, caught, thoughtsTapped }) {
  if (!shown) return 0;
  return clamp(Math.round((100 * caught) / shown - 8 * thoughtsTapped), 0, 100);
}

/** Judging replies tilt the relationship line; encouragement brings it back to level. */
export function tiltAfter(tilt, kind) {
  if (kind === "encourage") {
    const next = Math.round(tilt * 0.4);
    return Math.abs(next) < 3 ? 0 : next;
  }
  const step = kind === "defer" ? -12 : 12; // defer = you below them; others = you above
  return clamp(tilt + step, -MAX_TILT, MAX_TILT);
}

export function isCorrect(nightId, item, answer) {
  switch (nightId) {
    case "n1": return answer === item.correct;
    case "n2": return answer === item.bin;
    case "n3": return answer === item.owner;
    case "n4": return item.options[answer]?.kind === "encourage";
    default: return false;
  }
}

/* ---------- Ten Faces (night 3 finale) ---------- */

/** Drain rate per face, in percentage points per second. Together they outrun one person. */
export function faceRates(rng) {
  return Array.from({ length: FACE_COUNT }, () => 15 + Math.round(rng() * 12));
}

export function facesStep(levels, dtMs, rates) {
  return levels.map((l, i) => clamp(l - (rates[i] * dtMs) / 1000, 0, 100));
}

/** One click wins back only part of one person's approval. */
export const REFILL = 35;
export function refill(levels, index) {
  return levels.map((l, i) => (i === index ? clamp(l + REFILL, 0, 100) : l));
}

/** Out of ten people: one dislikes you, two are in your corner, seven don't think about it much. */
export function settleFaces(rng) {
  return shuffle(["frown", "smile", "smile", ...Array(7).fill("neutral")], rng);
}

/* ---------- profile ---------- */

export function courage(scores) {
  if (!NIGHT_IDS.every((id) => Number.isFinite(scores[id]))) return null;
  return Math.round(NIGHT_IDS.reduce((s, id) => s + scores[id], 0) / NIGHT_IDS.length);
}

export function archetype(scores) {
  if (NIGHT_IDS.every((id) => scores[id] >= 80)) return "light";
  let weakest = NIGHT_IDS[0];
  for (const id of NIGHT_IDS) if (scores[id] < scores[weakest]) weakest = id;
  return weakest;
}

export function profile(scores) {
  return { scores: { ...scores }, courage: courage(scores), archetype: archetype(scores) };
}

export function shareText({ name, courage: c }, url) {
  return `I played Cut the Knot, a five-night mind game. My lifestyle: ${name}. Courage ${c}/100. Can you cut yours? ${url}`;
}

/* ---------- routing ---------- */

export function parseRoute(hash) {
  const h = (hash || "").replace(/^#/, "");
  if (h === "" || h === "/") return { name: "home" };
  if (h === "/end") return { name: "end" };
  const m = /^\/night\/([1-5])$/.exec(h);
  if (m) return { name: "night", n: Number(m[1]) };
  return { name: "home" };
}

/* ---------- progress (storage adapter may be null or throw) ---------- */

export function loadProgress(storage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    const out = {};
    for (const id of NIGHT_IDS) {
      if (Number.isFinite(data?.[id])) out[id] = clamp(Math.round(data[id]), 0, 100);
    }
    return out;
  } catch {
    return {};
  }
}

export function saveNightScore(storage, progress, nightId, score) {
  const best = Math.max(score, progress[nightId] ?? -1);
  const next = { ...progress, [nightId]: best };
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: keep playing without saving (REQ-SAVE-1) */
  }
  return next;
}

export function allDone(progress) {
  return NIGHT_IDS.every((id) => Number.isFinite(progress[id]));
}

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

/** Progress is stored per signed-in user so people sharing a browser don't share it. */
export function progressKey(uid) {
  return `${STORAGE_KEY}:${uid}`;
}

export function loadProgress(storage, key = STORAGE_KEY) {
  try {
    const raw = storage?.getItem(key);
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

export function saveNightScore(storage, progress, nightId, score, key = STORAGE_KEY) {
  const best = Math.max(score, progress[nightId] ?? -1);
  const next = { ...progress, [nightId]: best };
  try {
    storage?.setItem(key, JSON.stringify(next));
  } catch {
    /* storage blocked: keep playing without saving (REQ-SAVE-1) */
  }
  return next;
}

export function allDone(progress) {
  return NIGHT_IDS.every((id) => Number.isFinite(progress[id]));
}

/* ---------- v2: player records and stats (REQ-STATS-1..3) ---------- */

/** The only fields a player document may hold. Mirrors cv-private/firestore.rules. */
export const PLAYER_FIELDS = ["name", "email", "firstSeen", "lastSeen", "plays", "best", "answers", "courage", "archetype"];

/** Merge saved best scores into local progress; the higher score wins, junk is ignored. */
export function mergeProgress(local, remoteBest) {
  const out = { ...local };
  for (const id of NIGHT_IDS) {
    const r = remoteBest?.[id];
    if (Number.isFinite(r)) out[id] = Math.max(clamp(Math.round(r), 0, 100), out[id] ?? -1);
  }
  return out;
}

/** The data part of a player update after finishing a night (timestamps are added by auth.js). */
export function nightUpdate({ nightId, answers, progress }) {
  const update = { best: { [nightId]: progress[nightId] }, answers: { ...answers } };
  if (allDone(progress)) {
    const p = profile(progress);
    update.courage = p.courage;
    update.archetype = p.archetype;
  }
  return update;
}

function answerLabel(nightId, item, answer, night) {
  if (nightId === "n1" || nightId === "n4") {
    const o = item.options[answer];
    return typeof o === "string" ? o : o?.text ?? String(answer);
  }
  if (nightId === "n2") return night.bins.find((b) => b.id === answer)?.label ?? String(answer);
  if (nightId === "n3") return answer === "mine" ? "Mine" : answer === "theirs" ? "Theirs" : String(answer);
  return String(answer);
}

/** Owner stats across all player documents, computed from the game's own content. */
export function aggregateStats(players, nights) {
  const finishedPlayers = players.filter((p) => Number.isFinite(p.courage));
  const archetypes = {};
  for (const p of finishedPlayers) if (p.archetype) archetypes[p.archetype] = (archetypes[p.archetype] ?? 0) + 1;
  const questions = [];
  for (const night of nights.slice(0, 4)) {
    for (const item of night.items) {
      let answered = 0, correct = 0;
      const wrong = {};
      for (const p of players) {
        const a = p.answers?.[item.id];
        if (a === undefined || a === null) continue;
        answered++;
        if (isCorrect(night.id, item, a)) correct++;
        else { const label = answerLabel(night.id, item, a, night); wrong[label] = (wrong[label] ?? 0) + 1; }
      }
      const topWrong = Object.entries(wrong).sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
      questions.push({
        nightId: night.id, id: item.id, prompt: item.excuse ?? item.text ?? item.scene,
        answered, correct, pct: answered ? Math.round((100 * correct) / answered) : null, topWrong,
      });
    }
  }
  questions.sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101) || b.answered - a.answered);
  return {
    players: players.length,
    finished: finishedPlayers.length,
    avgCourage: finishedPlayers.length
      ? Math.round(finishedPlayers.reduce((s, p) => s + p.courage, 0) / finishedPlayers.length) : null,
    archetypes,
    questions,
  };
}

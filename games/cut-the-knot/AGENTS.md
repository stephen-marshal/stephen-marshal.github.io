# AGENTS.md — Cut the Knot

A map for anyone, human or coding agent, changing this game. Keep it short and true.
If something here is wrong, fix this file in the same change.

## What this is
A static browser game (no build step, no dependencies) served by GitHub Pages at
`https://stephen-marshal.github.io/games/cut-the-knot/`. Pushing to `main` deploys it.

## Where things are
| Path | Role | Rules |
|---|---|---|
| `SPEC.md` | **Source of truth.** Requirements with IDs (`REQ-…`). | Change this first. |
| `src/content.js` | All text and items for the five nights. | Data only, with no functions (REQ-CONTENT-1). Write in your own words (REQ-ORIG-1). |
| `src/engine.js` | Pure logic: RNG, scoring, profile, share text, progress. | No DOM, `window`, storage or timers (REQ-ARCH-1). |
| `src/ui.js` | Rendering, input, timers, routing, storage. | The only file that touches the DOM. |
| `index.html`, `game.css` | Page shell and styles. | Reuse the site tokens from `/style.css` (REQ-A11Y-3). |
| `tests/*.test.mjs` | Unit, content, architecture and traceability checks (`node:test`). | Every test name cites the `REQ-…` it covers. |
| `tools/e2e.mjs` | Headless Chrome plays the whole game through the DevTools protocol. | Uses `?test=1` to speed up timers. |
| `tools/serve.mjs` | Tiny static server for local play and e2e. | |

## Commands (run from the repo root)
```bash
node --test games/cut-the-knot/tests/            # all fast checks (< 1 s)
node games/cut-the-knot/tools/e2e.mjs            # full play-through in headless Chrome
node games/cut-the-knot/tools/serve.mjs          # play locally at http://localhost:8765/games/cut-the-knot/
```
CI runs both (`.github/workflows/cut-the-knot.yml`).

## How to make a change (spec-driven)
1. Edit `SPEC.md`: add or change a `REQ-…`.
2. Add or adjust a test that names that ID. Run it and **watch it fail**.
3. Change the code until it passes. Run the e2e test.
4. If the change is visual, take screenshots of light and dark mode at phone and desktop widths.

## Invariants the harness enforces
- Every `REQ-…` in the spec has a test, and tests cite no unknown IDs (`traceability.test.mjs`).
- `engine.js` stays pure, and `content.js` stays data (`architecture.test.mjs`).
- No third-party scripts, and the game files total ≤ 150 KB.
- Content passes the safety deny-list and the originality guard (`content.test.mjs`).

## Gotchas
- Asset URLs carry `?v=N`. Bump it when you change a CSS or JS file so browsers don't serve a stale copy.
- `localStorage` can throw (private mode, blocked storage). Always go through `engine.loadProgress` / `saveProgress` with a storage adapter.
- Night 5 deliberately shows **no timer**. Don't "fix" that (REQ-N5-1).
- This is a personal project. Nothing from the owner's employer goes in here.

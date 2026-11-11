# Cut the Knot — Specification

Status: **v1.0** · Owner: Stephen Marshall · Source of truth for behaviour.

> This file is written **before** code. Every requirement has an ID (`REQ-…`).
> Every ID must be covered by at least one automated test that names it.
> `tests/traceability.test.mjs` enforces this both ways: a requirement with no test
> fails the build, and so does a test that cites an ID which is not in this file.
> To change behaviour, change this file first, then the tests, then the code.

## 1. Purpose

A short, playable browser game about how we think, based on ideas from Adlerian
psychology as popularised by *The Courage to Be Disliked* (Ichiro Kishimi and
Fumitake Koga). It is published on my CV site. It should be fun first and teach
second: each level turns one idea into a mechanic you *do*, not a quiz you read.

The theme is the **Gordian knot**: the player arrives with five tangled threads.
Each night they finish straightens one thread, and when all five are straight the
knot is cut.

## 2. Non-goals

- Not therapy, diagnosis or a personality test. The game says so (REQ-SAFE-1).
- No accounts, backend, analytics or cookies. Nothing leaves the browser.
- No reproduction of the book's text or characters. Ideas only, in my own words.

## 3. Structure

| Night | Title | Idea | Mechanic |
|---|---|---|---|
| 1 | Cause or Goal | Behaviour serves a present goal, not only a past cause | Pick the hidden goal behind an excuse, then flip the card from "because…" to "so that…" |
| 2 | Fuel or Excuse | A feeling of inferiority can be fuel; a complex is an excuse; boasting is a mask | Sort statements into three bins |
| 3 | Whose Task? | Separation of tasks: who lives with the result? | Swipe Mine / Theirs, then the "Ten Faces" approval round |
| 4 | Level the Line | Horizontal relationships: encourage, don't praise or rebuke | Choose replies; a relationship line tilts or levels |
| 5 | Dance the Dots | Life is a series of moments, here and now | Tap the "now" dot; ignore drifting thoughts about past and future |

## 4. Requirements

### 4.1 Game flow

- **REQ-FLOW-1** The home screen shows the knot (five threads) and a list of the five nights. Every night can be played in any order.
- **REQ-FLOW-2** Routing uses the URL hash: `#/` home, `#/night/<1-5>` a night, `#/end` the finale. The browser back button works, and a deep link opens the right screen.
- **REQ-FLOW-3** Each night has three phases: **intro** (the idea, how to play, a likely objection and a reply), **play**, and **recap** (score, takeaway, one "try this today" action).
- **REQ-FLOW-4** Finishing a night straightens its thread on the knot. When all five are finished, the home screen offers the finale.
- **REQ-FLOW-5** The finale shows the cut knot, the player's profile (REQ-SCORE-6) and the "guiding star" message, with Share and Play again.

### 4.2 Mechanics

- **REQ-N1-1** Night 1 shows excuses one at a time with three candidate goals. Exactly one is the goal-based reading. After an answer, the card flips to show the "so that…" reframe, whether the answer was right or wrong.
- **REQ-N2-1** Night 2 shows statements one at a time, sorted into **Fuel**, **Excuse** or **Mask**. Feedback names the correct bin and why.
- **REQ-N3-1** Night 3 shows task cards sorted into **Mine** or **Theirs** with buttons, the ← / → keys, or a horizontal swipe. Feedback always says who lives with the result.
- **REQ-N3-2** Night 3 ends with "Ten Faces": ten approval bars that drain faster than one person can refill them. After a short delay, a "Stop chasing approval" option appears. Choosing it ends the round as a success. If the time runs out first, the round ends as burnout. Either way, the 1–2–7 lesson is shown.
- **REQ-N4-1** Night 4 shows scenarios with four replies: one encouraging and three that judge from above or below (praise, rebuke, intervene, defer). A visible line tilts with judging replies and levels with encouraging ones.
- **REQ-N5-1** Night 5 shows one "now" dot at a time for a short life. It can be tapped or caught with Space / Enter. Thought bubbles labelled past or future drift in, and tapping one costs points. No countdown timer or progress bar is shown during play. That is the point.
- **REQ-N5-2** At the end of Night 5, the dots the player caught are joined, in order, into a single line, with the message that the line was always made of dots.

### 4.3 Scoring and profile

- **REQ-SCORE-1** Every night scores an integer from 0 to 100.
- **REQ-SCORE-2** Nights 1, 2 and 4 score the share of correct answers.
- **REQ-SCORE-3** Night 3 scores 75% from the cards and 25% from Ten Faces (stopping = 100, burnout = 30).
- **REQ-SCORE-4** Night 5 scores `100 × caught / shown − 8 × thoughts tapped`, limited to the range 0–100.
- **REQ-SCORE-5** Courage is the rounded mean of the five night scores.
- **REQ-SCORE-6** The profile archetype comes from the weakest night (ties go to the earlier night): 1 The Archivist, 2 The Comparer, 3 The Approval Collector, 4 The Judge, 5 The Summit Chaser. If every night is 80 or above, the archetype is The Light Traveller.
- **REQ-SCORE-7** Randomness (card order, dot positions) comes from a seeded RNG, so a given seed always produces the same game.

### 4.4 Persistence and sharing

- **REQ-SAVE-1** Progress (best score per night) is saved to `localStorage`. If storage is missing, blocked or throws, the game still works, just without saving.
- **REQ-SHARE-1** The share text contains the archetype, the courage score and the game URL, and no personal data. It uses the Web Share API if available, otherwise the clipboard, otherwise it shows the text.

### 4.5 Content

- **REQ-CONTENT-1** Content is data only, kept in `src/content.js`, separate from logic and UI.
- **REQ-CONTENT-2** Each night has: id, title, idea, howTo, objection, reply, takeaway, tryToday.
- **REQ-CONTENT-3** Minimum items: N1 ≥ 6 (3 options, exactly one correct), N2 ≥ 9 (at least 2 of each bin), N3 ≥ 8 (at least 3 Mine and 3 Theirs), N4 ≥ 5 (4 options, exactly one encourage), N5 ≥ 8 thoughts (both past and future).
- **REQ-CONTENT-4** Item ids are unique across the game.
- **REQ-CONTENT-5** Feedback and option text is short enough for a phone: at most 240 characters each.
- **REQ-ORIG-1** Originality: no quoted passage longer than 12 words, and no use of the book's character labels. The page credits the book and authors as inspiration and states it is not affiliated.
- **REQ-SAFE-1** The game states it is a thinking game, not therapy. Content avoids self-harm, abuse and trauma scenarios (checked with a deny-list).

### 4.6 Quality

- **REQ-A11Y-1** Every action works with a keyboard. Feedback is announced through an `aria-live` region. The page has `lang`, a `<title>` and a meta description.
- **REQ-A11Y-2** `prefers-reduced-motion` turns off drifting and flip animations. Night 5 gives longer dot lifetimes, so it stays playable.
- **REQ-A11Y-3** Light and dark themes use the site's shared tokens and theme switch.
- **REQ-PERF-1** No third-party scripts. Game files total at most 150 KB, not counting shared site files.
- **REQ-ARCH-1** `src/engine.js` is pure: no DOM, no `window`, no storage, no timers. Only `src/ui.js` touches the DOM.
- **REQ-E2E-1** A headless browser test plays all five nights to the finale with the `?test=1` speed-up, and fails if the page logs an error.

### 4.7 Harness

- **REQ-HARNESS-1** `node --test "games/cut-the-knot/tests/*.test.mjs"` runs every unit, content and architecture check without installing anything.
- **REQ-HARNESS-2** CI runs the same checks, plus the end-to-end test, on every push and pull request that touches the game.
- **REQ-HARNESS-3** Every requirement in this file is cited by at least one test, and every test cites only requirements that exist here.

## 5. Acceptance

The feature is done when all of these are true:
1. All tests and the end-to-end run pass locally and in CI.
2. The game is reachable from the homepage Projects section.
3. Screenshots of home, a night in play and the finale have been checked in light and dark mode at phone and desktop widths.

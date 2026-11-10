// Interactive kubectl-style terminal on the homepage.
// Public resources work for everyone; CV resources unlock after sign-in and are read
// from the CV HTML that app.js loads into #cv (so there is no second copy to maintain).
// Blog, article and project lists are read from the homepage cards (#latest, #articles, #projects).

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

const LINKEDIN = "https://www.linkedin.com/in/stephenmarshallsheerness";
const MEDIUM = "https://medium.com/@stephen.marshall.sheerness";
const MOTTO = "Continuous learning is the minimum requirement for success in any field.";
// Public copy of "How I Work". Keep in step with cv-content.html.
const PRINCIPLES = [
  ["People over process over tools", "Get the team and the way of working right, and the tooling follows."],
  ["Continuous delivery", "Small, frequent, tested releases with fast feedback."],
  ["Infrastructure as code", "Systems versioned, reviewed, built and tested like any other code."],
  ["Lean change control", "Repeatable builds, managed dependencies, no fragile artefacts."],
];

const RES = {
  engineer: ["engineer", "engineers", "stephen", "me", "stephen-marshall"],
  linkedin: ["linkedin", "li"],
  blog: ["blog", "blogs", "posts", "post"],
  articles: ["articles", "article", "medium"],
  projects: ["projects", "project", "proj", "deployments", "deploy", "councilofmodels", "council"],
  "how-i-work": ["how-i-work", "howiwork", "principles", "principle", "how-i-works"],
  dog: ["dog", "dogs", "pup", "puppy"],
  summary: ["summary", "about"],
  skills: ["skills", "skill"],
  experience: ["experience", "experiences", "jobs", "job", "career", "exp"],
  certifications: ["certifications", "certification", "certs", "cert"],
  education: ["education", "edu"],
  writing: ["writing"],
  outside: ["outside", "hobbies", "life"],
};
const GATED = new Set(["summary", "skills", "experience", "certifications", "education", "writing", "outside"]);
const CV_HEADING = { summary: "summary", skills: "skills", experience: "experience", certifications: "certifications", education: "education", writing: "writing", "how-i-work": "how i work" };

const PUBLIC_CHIPS = ["kubectl describe engineer stephen", "kubectl get projects", "kubectl get articles", "kubectl get blog", "kubectl get how-i-work", "kubectl get linkedin", "kubectl describe dog", "help"];
const PRIVATE_CHIPS = ["kubectl get summary", "kubectl get skills", "kubectl logs career", "kubectl get experience", "kubectl get certifications", "kubectl get education", "kubectl get writing", "help"];
const COMPLETIONS = [
  "help", "clear", "whoami", "history",
  "kubectl get engineer", "kubectl describe engineer stephen", "kubectl get linkedin", "kubectl get blog", "kubectl get articles",
  "kubectl get projects", "kubectl describe projects", "kubectl get how-i-work", "kubectl describe dog", "kubectl top engineer", "kubectl api-resources",
  "kubectl get summary", "kubectl get skills", "kubectl logs career", "kubectl get experience", "kubectl describe experience ",
  "kubectl get certifications", "kubectl get education", "kubectl get writing", "kubectl get outside",
  "kubectl auth login", "kubectl auth logout", "kubectl auth whoami",
];

function init() {
  const body = $("#term-body"), out = $("#term-out"), input = $("#term-input"), chips = $("#term-chips");
  if (!body || !out || !input) return;

  let user = document.body.classList.contains("signed-in") ? "you" : null;
  let cvRoot = $("#cv")?.innerHTML.trim() ? $("#cv") : null;
  const history = [];
  let hIdx = 0;

  // ---------- output helpers ----------
  const line = (html, cls = "") => { const d = document.createElement("div"); d.className = `term-line ${cls}`; d.innerHTML = html; out.appendChild(d); return d; };
  const pre = (html) => { const d = document.createElement("div"); d.className = "term-pre"; d.innerHTML = html; out.appendChild(d); };
  const blank = () => line("&nbsp;");
  const cmd = (c, label = c) => `<button type="button" class="term-cmd" data-cmd="${esc(c)}">${esc(label)}</button>`;
  const link = (href, label, ext = /^https?:/.test(href)) => `<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${esc(label)}</a>`;
  const scroll = () => { body.scrollTop = body.scrollHeight; };
  const promptText = () => `${user ? user.split("@")[0].replace(/[^a-z0-9._-]/gi, "") || "you" : "guest"}@stephen-cv:~$`;

  function table(headers, rows) {
    const all = [headers, ...rows].map((r) => r.map((c) => clean(String(c))));
    const w = headers.map((_, i) => Math.max(...all.map((r) => r[i].length)));
    const fmt = (r) => r.map((c, i) => esc(i === r.length - 1 ? c : c.padEnd(w[i]))).join("   ");
    pre(`<span class="k">${fmt(all[0])}</span>\n${all.slice(1).map(fmt).join("\n")}`);
  }

  // ---------- data ----------
  const cards = (sel) => $$(`${sel} .post-card`).map((a) => ({
    href: a.getAttribute("href"),
    meta: clean($(".meta", a)?.textContent).replace(/\s*·\s*Medium\s*↗?$/, ""),
    title: clean($("strong", a)?.textContent),
    lines: $$("p, span", a).map((e) => clean(e.textContent)).filter(Boolean),
  }));
  const section = (key) => cvRoot && $$("section", cvRoot).find((s) => clean($("h2", s)?.textContent).toLowerCase() === CV_HEADING[key]);
  const jobs = (sec) => $$(".job", sec).map((j) => ({
    when: clean($(".when", j)?.textContent),
    title: clean($("h3", j)?.textContent),
    org: clean($(".org", j)?.innerText || $(".org", j)?.textContent),
    paras: $$(":scope > div > p", j).map((p) => clean(p.textContent)),
    bullets: $$("li", j).map((l) => clean(l.textContent)),
  }));

  // ---------- resources ----------
  function getEngineer() {
    table(["NAME", "ROLE", "STATUS", "LINKS"], [["stephen-marshall", "DevOps · SRE · Platform Engineering", "Running", "linkedin, blog, articles, projects"]]);
    line(`<span class="m">Next:</span> ${cmd("kubectl describe engineer stephen")}`);
  }
  function describeEngineer() {
    const ev = [...cards("#articles"), ...cards("#latest")].slice(0, 4);
    pre([
      `<span class="k">Name:</span>         stephen-marshall`,
      `<span class="k">Role:</span>         DevOps, SRE &amp; Platform Engineering Artisan`,
      `<span class="k">Labels:</span>       devops, sre, platform-engineering, kubernetes, aws`,
      `<span class="k">Annotations:</span>  motto="${esc(MOTTO)}"`,
      `<span class="k">Links:</span>`,
      `  LinkedIn:   ${link(LINKEDIN, "linkedin.com/in/stephenmarshallsheerness")}`,
      `  Blog:       ${link("blog/", "stephen-marshal.github.io/blog")}`,
      `  Articles:   ${link("articles/", "stephen-marshal.github.io/articles")}`,
      `  Projects:   ${link("#projects", "stephen-marshal.github.io/#projects")}`,
      `<span class="k">Status:</span>       Running`,
      `<span class="k">Events:</span>`,
      `  <span class="m">Type     Reason      Message</span>`,
      ...ev.map((e) => `  Normal   Published   ${link(e.href, e.title)}`),
    ].join("\n"));
    line(`<span class="m">Try:</span> ${cmd("kubectl get how-i-work")} ${cmd(user ? "kubectl logs career" : "kubectl auth login")}`);
  }
  function getList(sel, emptyMsg, more) {
    const list = cards(sel);
    if (!list.length) return line(emptyMsg, "m");
    list.forEach((c, i) => {
      line(`<span class="m">${esc(c.meta)}</span>`);
      line(`${i + 1}. ${link(c.href, c.title)}`);
      c.lines.forEach((l) => line(`   ${esc(l).replace(/^(Takeaway:|Why read:)/, '<span class="k">$1</span>')}`, "dim"));
      if (i < list.length - 1) blank();
    });
    blank();
    line(more);
  }
  function getProjects() {
    const list = cards("#projects");
    if (!list.length) return line("No projects yet.", "m");
    table(["NAME", "ROLE", "STATUS", "URL"], list.map((c) => {
      const parts = c.meta.split("·").map(clean);
      const live = parts.find((x) => /^live/i.test(x));
      return [c.title.toLowerCase().replace(/\s+/g, "-"), parts[0] || "-", live ? "Running" : "Building", c.href.replace(/^https?:\/\//, "").replace(/\/$/, "")];
    }));
    line(`<span class="m">Open:</span> ${list.map((c) => link(c.href, c.title)).join(" · ")} <span class="m">· Next:</span> ${cmd("kubectl describe projects")}`);
  }
  function getHowIWork() {
    const sec = section("how-i-work");
    const items = sec ? $$(".principles > div", sec).map((d) => [clean($("strong", d)?.textContent), clean($("span", d)?.textContent)]) : PRINCIPLES;
    items.forEach(([t, d], i) => { line(`<span class="k">${i + 1}. ${esc(t)}</span>`); line(`   ${esc(d)}`, "dim"); });
  }
  function describeDog() {
    pre([
      `<span class="k">Name:</span>          chief-morale-officer`,
      `<span class="k">Namespace:</span>     home`,
      `<span class="k">Role:</span>          Keeps the on-call engineer sane`,
      `<span class="k">Status:</span>        Napping (as usual)`,
      `<span class="k">Tolerations:</span>   belly-rubs:NoSchedule, long-walks:PreferNoSchedule`,
      `<span class="k">Note:</span>          Appears in the portrait. Ask Stephen for the real name.`,
    ].join("\n"));
  }
  function topEngineer() {
    table(["NAME", "CPU(coffee)", "MEMORY(incidents)", "CURIOSITY"], [["stephen-marshall", "87%", "~20 years", "unbounded"]]);
  }

  function getSummary() { $$("p", section("summary")).forEach((p) => { line(esc(clean(p.textContent))); blank(); }); }
  function getSkills() {
    $$(".skill-group", section("skills")).forEach((g) => {
      line(`<span class="k">${esc(clean($("h3", g)?.textContent))}</span>`);
      line(`   ${esc($$(".chip", g).map((c) => clean(c.textContent)).join(" · "))}`, "dim");
    });
  }
  function getExperience() {
    const js = jobs(section("experience"));
    table(["#", "WHEN", "ROLE", "ORG"], js.map((j, i) => [i + 1, j.when, j.title, j.org.split(" · ")[0] || "-"]));
    line(`<span class="m">Details:</span> ${cmd("kubectl describe experience 1")}`);
  }
  function describeExperience(n) {
    const js = jobs(section("experience"));
    const j = js[(parseInt(n, 10) || 1) - 1];
    if (!j) return line(`Error from server (NotFound): experience "${esc(n)}" not found. Valid: 1–${js.length}`, "e");
    pre([
      `<span class="k">Role:</span>   ${esc(j.title)}`,
      j.org ? `<span class="k">Org:</span>    ${esc(j.org)}` : "",
      `<span class="k">When:</span>   ${esc(j.when)}`,
    ].filter(Boolean).join("\n"));
    j.paras.forEach((p) => line(esc(p), "dim"));
    j.bullets.forEach((b) => line(`  • ${esc(b)}`));
    const i = js.indexOf(j);
    line(`<span class="m">More:</span> ${i > 0 ? cmd(`kubectl describe experience ${i}`, "← newer") : ""} ${i < js.length - 1 ? cmd(`kubectl describe experience ${i + 2}`, "older →") : ""}`);
  }
  function logsCareer() {
    jobs(section("experience")).forEach((j) => {
      line(`<span class="m">[${esc(j.when)}]</span> ${esc(j.title)}${j.org ? ` <span class="k">@ ${esc(j.org.split(" · ")[0])}</span>` : ""}`);
    });
    line(`<span class="m">-- end of log · </span>${cmd("kubectl get experience")}`);
  }
  function getItems(key) {
    $$(".item", section(key)).forEach((it) => {
      const a = $("a", it);
      const title = clean($("strong", it)?.textContent);
      line(`• ${a ? link(a.getAttribute("href"), title) : esc(title)} <span class="m">· ${esc(clean($("span", it)?.textContent))}</span>`);
    });
  }
  function getEducation() {
    jobs(section("education")).forEach((j) => {
      line(`<span class="m">[${esc(j.when)}]</span> ${esc(j.title)}`);
      if (j.org) line(`   ${esc(j.org)}`, "dim");
    });
  }
  function getOutside() {
    const f = cvRoot && $("footer", cvRoot);
    line(esc(clean(f?.textContent) || "Outside work: see the CV."));
  }

  function forbidden(res) {
    line(`Error from server (Forbidden): ${esc(res)} is forbidden: User "system:anonymous" cannot get resource "${esc(res)}" in namespace "cv"`, "e");
    line(`🔒 The full CV unlocks after sign-in. ${cmd("kubectl auth login")} or <button type="button" class="term-btn" data-login>Sign in with Google</button>`);
  }

  function api() {
    table(["RESOURCE", "SHORTNAMES", "ACCESS"], Object.entries(RES).map(([k, al]) => [k, al.filter((a) => a !== k).slice(0, 2).join(","), GATED.has(k) ? (user ? "granted" : "🔒 sign-in") : "public"]));
  }

  function help() {
    line(`<span class="k">Public</span>`);
    [["kubectl get engineer", "who I am"], ["kubectl describe engineer stephen", "the longer version"], ["kubectl get linkedin", "connect with me"],
     ["kubectl get blog", "posts on this site"], ["kubectl get articles", "longer pieces on Medium"], ["kubectl get projects", "things I've built and run"], ["kubectl get how-i-work", "my working principles"],
     ["kubectl describe dog", "the other one in the photo"]]
      .forEach(([c, d]) => line(`  ${cmd(c)} <span class="m">${d}</span>`));
    blank();
    line(`<span class="k">Full CV</span> <span class="m">${user ? "✓ unlocked" : "🔒 sign-in required"}</span>`);
    [["kubectl get summary", "about me"], ["kubectl get skills", "what I work with"], ["kubectl logs career", "my career, newest first"],
     ["kubectl get experience", "roles as a table"], ["kubectl describe experience 1", "one role in detail"], ["kubectl get certifications", "certs"],
     ["kubectl get education", "education"], ["kubectl get writing", "everything I've written"], [user ? "kubectl auth logout" : "kubectl auth login", user ? "sign out" : "sign in with Google"]]
      .forEach(([c, d]) => line(`  ${cmd(c)} <span class="m">${d}</span>`));
    blank();
    line(`<span class="m">Also: ${cmd("clear")} ${cmd("whoami")} ${cmd("kubectl api-resources")} · Tab completes · ↑/↓ history</span>`);
  }

  function login() {
    if (user) return line(`Already authenticated as ${esc(user)}.`, "ok");
    const btn = $('.provider[data-provider="google"]');
    if (!btn) return line("Sign-in is unavailable right now. Please refresh.", "e");
    line("Opening Google sign-in…", "m");
    btn.click();
  }
  function logout() {
    if (!user) return line("Not signed in.", "m");
    $("#signout")?.click();
  }

  // ---------- dispatcher ----------
  function resolve(word) {
    for (const [k, al] of Object.entries(RES)) if (al.includes(word)) return k;
    return null;
  }
  function show(res, verb, arg) {
    if (GATED.has(res)) {
      if (!user) return forbidden(res);
      if (!cvRoot) return line("The CV is still loading. Try again in a moment.", "m");
    }
    switch (res) {
      case "engineer": return verb === "describe" ? describeEngineer() : getEngineer();
      case "linkedin": return line(`${link(LINKEDIN, "linkedin.com/in/stephenmarshallsheerness")} <span class="m">· say hello, I read every message</span>`);
      case "blog": return getList("#latest", "No posts yet.", `<span class="m">All posts:</span> ${link("blog/", "stephen-marshal.github.io/blog")}`);
      case "articles": return getList("#articles", "No articles yet.", `<span class="m">All articles:</span> ${link("articles/", "stephen-marshal.github.io/articles")} · ${link(MEDIUM, "Medium profile")}`);
      case "projects": return verb === "describe" ? getList("#projects", "No projects yet.", `<span class="m">See them on the page:</span> ${link("#projects", "Projects")}`) : getProjects();
      case "how-i-work": return getHowIWork();
      case "dog": return verb === "describe" ? describeDog() : table(["NAME", "READY", "STATUS", "RESTARTS"], [["chief-morale-officer", "1/1", "Napping", "0 (never)"]]);
      case "summary": return getSummary();
      case "skills": return getSkills();
      case "experience": return verb === "describe" ? describeExperience(arg) : getExperience();
      case "certifications": return getItems("certifications");
      case "writing": return getItems("writing");
      case "education": return getEducation();
      case "outside": return getOutside();
    }
  }

  function exec(raw) {
    const input = clean(raw);
    if (!input) return;
    let t = input.toLowerCase().split(" ");
    if (t[0] === "kubectl" || t[0] === "k") t = t.slice(1);
    t = t.filter((x) => !x.startsWith("-") && x !== "wide" && x !== "yaml" && x !== "json");
    const [verb, ...rest] = t;

    switch (verb) {
      case undefined: return help();
      case "help": case "?": case "man": return help();
      case "clear": case "cls": out.innerHTML = ""; return;
      case "whoami": return line(user ? esc(user) : "system:anonymous <span class=\"m\">(guest)</span>");
      case "history": return history.forEach((h, i) => line(`${String(i + 1).padStart(4)}  ${esc(h)}`));
      case "login": return login();
      case "logout": return logout();
      case "ls": case "api-resources": return api();
      case "exit": case "quit": return line("There's no escape from continuous learning. 😉", "m");
      case "sudo": return line(`${esc(user || "guest")} is not in the sudoers file. This incident will be reported.`, "e");
      case "open": {
        const r = resolve(rest[0]);
        const url = { linkedin: LINKEDIN, blog: "blog/", articles: "articles/", projects: "https://councilofmodels.uk" }[r];
        if (!url) return line("Usage: open linkedin | blog | articles | projects", "m");
        line(`Opening ${esc(r)}…`, "m");
        return url.startsWith("http") ? window.open(url, "_blank", "noopener") : (location.href = url);
      }
      case "auth": {
        if (rest[0] === "login") return login();
        if (rest[0] === "logout") return logout();
        if (rest[0] === "whoami" || rest[0] === "can-i") return line(user ? `${esc(user)} · full CV: yes` : "system:anonymous · full CV: no (run kubectl auth login)");
        return line("Usage: kubectl auth login | logout | whoami", "m");
      }
      case "top": return resolve(rest[0]) === "engineer" ? topEngineer() : line("Usage: kubectl top engineer", "m");
      case "logs": {
        const r = resolve(rest[0]);
        if (r === "experience") return user ? (cvRoot ? logsCareer() : line("The CV is still loading.", "m")) : forbidden("career");
        if (r === "dog") return line(`<span class="m">[03:12]</span> woof <span class="m">[03:13]</span> zzz`);
        return line(`Usage: ${cmd("kubectl logs career")}`, "m");
      }
      case "get": case "describe": {
        if (!rest.length || rest[0] === "all") return api();
        let res = resolve(rest[0]) || resolve(rest.join("-"));
        if (!res) return line(`error: the server doesn't have a resource type "${esc(rest[0])}". Try ${cmd("kubectl api-resources")}`, "e");
        return show(res, verb, rest[1]);
      }
      default:
        return line(`${esc(verb)}: command not found. Type ${cmd("help")} to see what I can do.`, "e");
    }
  }

  function run(raw, { echo = true } = {}) {
    const c = clean(raw);
    if (echo) line(`<span class="p">${esc(promptText())}</span> <span class="c">${esc(c)}</span>`, "cmdline");
    if (c) { history.push(c); hIdx = history.length; }
    exec(c);
    scroll();
  }

  // ---------- UI ----------
  function renderChips() {
    $("#term-prompt").textContent = promptText();
    $("#term-state").textContent = user ? "✓ signed in · full CV" : "🔒 public";
    const list = user ? PRIVATE_CHIPS : [...PUBLIC_CHIPS.slice(0, -1), "kubectl auth login", "help"];
    chips.innerHTML = list.map((c) => cmd(c)).join("");
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); run(input.value); input.value = ""; }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (hIdx > 0) input.value = history[--hIdx] || ""; }
    else if (e.key === "ArrowDown") { e.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ""; }
    else if (e.key === "Tab" && input.value.trim()) {
      e.preventDefault();
      const v = input.value.toLowerCase().replace(/^k /, "kubectl ");
      const m = COMPLETIONS.filter((c) => c.startsWith(v));
      if (m.length === 1) input.value = m[0];
      else if (m.length > 1) { line(`<span class="p">${esc(promptText())}</span> <span class="c">${esc(input.value)}</span>`, "cmdline"); line(m.map((c) => cmd(c)).join(" ")); scroll(); }
    } else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); out.innerHTML = ""; }
  });

  document.addEventListener("click", (e) => {
    const b = e.target.closest(".term-cmd");
    if (b && (out.contains(b) || chips.contains(b))) { run(b.dataset.cmd); return; }
    if (e.target.closest("[data-login]")) { login(); scroll(); return; }
    if (e.target.closest(".term-body") && !e.target.closest("a, button") && !window.getSelection()?.toString()) input.focus({ preventScroll: true });
  });

  const tag = $(".portrait .tag");
  if (tag) {
    tag.setAttribute("role", "button");
    tag.setAttribute("tabindex", "0");
    tag.title = "Run it in the terminal";
    const go = () => { $("#terminal").scrollIntoView({ behavior: "smooth", block: "center" }); run("kubectl get engineer"); };
    tag.addEventListener("click", go);
    tag.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  }

  // Auth + CV events from app.js
  window.addEventListener("cv:auth", (e) => {
    const was = user;
    user = e.detail?.user || null;
    if (!user) cvRoot = null;
    renderChips();
    if (was && !user) { line("Signed out. Public resources only.", "m"); scroll(); }
  });
  window.addEventListener("cv:ready", () => {
    const first = !cvRoot;
    cvRoot = $("#cv");
    renderChips();
    if (first) {
      line(`✓ Authenticated as ${esc(user)}. Full CV unlocked. Try ${cmd("kubectl get skills")} ${cmd("kubectl logs career")}`, "ok");
      scroll();
    }
  });

  // ---------- boot ----------
  renderChips();
  line(`Welcome to <span class="k">stephen-marshall</span>'s cluster. Type ${cmd("help")} or tap a command below.`, "m");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const first = "kubectl get engineer";
  if (reduce) { run(first); return; }
  const l = line(`<span class="p">${esc(promptText())}</span> <span class="c"></span><span class="cursor">▌</span>`, "cmdline");
  const span = $(".c", l);
  let i = 0;
  const tick = setInterval(() => {
    span.textContent = first.slice(0, ++i);
    if (i >= first.length) {
      clearInterval(tick);
      $(".cursor", l)?.remove();
      history.push(first); hIdx = history.length;
      exec(first);
      scroll();
    }
  }, 55);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

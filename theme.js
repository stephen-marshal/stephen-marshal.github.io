// Light / Dark switch shared by every page (top right).
// Load this in <head> (not deferred) so the saved theme applies before first paint.
(function () {
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  } catch (e) { /* storage blocked: follow the system setting */ }

  function current() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  var ICONS = {
    light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>'
  };

  document.addEventListener("DOMContentLoaded", function () {
    var wrap = document.createElement("div");
    wrap.className = "theme-switch";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Colour theme");
    var buttons = ["light", "dark"].map(function (mode) {
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.mode = mode;
      b.innerHTML = ICONS[mode] + "<span>" + (mode === "light" ? "Light" : "Dark") + "</span>";
      b.addEventListener("click", function () {
        root.dataset.theme = mode;
        try { localStorage.setItem("theme", mode); } catch (e) {}
        sync();
      });
      wrap.appendChild(b);
      return b;
    });
    function sync() {
      var now = current();
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.mode === now)); });
    }
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", sync);
    sync();
    document.body.appendChild(wrap);
  });
})();

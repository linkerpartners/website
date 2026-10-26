/* ==========================================================
   움직임: 커서 · 고정 장면(진행 방식)
   1) 커서: 작은 점은 바로, 링은 천천히 따라옴. 링크 위에서 링이 커지며 옅게 채워지고,
      [data-cursor] 위(사례 라이브러리 카드)에서는 원 · 점이 사라지고 글자(보기 · ← →)만 띄움.
   (첫 화면 장면은 hero.js)
   2) 고정 장면(data-story): 화면이 멈춘 채 스크롤에 따라 단계 문장이 하나씩 바뀜.
   ========================================================== */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = function (v) {
    return Math.min(1, Math.max(0, v));
  };

  /* ---------- 1. 커서 ---------- */
  function initCursor() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const dot = document.createElement("div");
    const ring = document.createElement("div");
    dot.className = "cursor-dot";
    ring.className = "cursor-ring";
    dot.setAttribute("aria-hidden", "true");
    ring.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "cursor-label";
    ring.appendChild(label);
    document.body.append(dot, ring);
    document.documentElement.classList.add("has-cursor");

    let x = -100;
    let y = -100;
    let rx = x;
    let ry = y;
    let raf = 0;

    function frame() {
      raf = 0;
      const k = reduce.matches ? 1 : 0.16;
      rx += (x - rx) * k;
      ry += (y - ry) * k;
      dot.style.transform = "translate3d(" + x + "px," + y + "px,0)";
      ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
      if (Math.abs(x - rx) > 0.1 || Math.abs(y - ry) > 0.1) raf = requestAnimationFrame(frame);
    }

    window.addEventListener(
      "pointermove",
      function (e) {
        if (e.pointerType === "touch") return;
        x = e.clientX;
        y = e.clientY;
        document.documentElement.classList.add("cursor-visible");
        const t = e.target;
        const field = t.closest && t.closest("input, textarea, select, [contenteditable]");
        const link = !field && t.closest && t.closest("a, button, [role='button'], label");
        document.documentElement.classList.toggle("cursor-on-link", !!link);
        document.documentElement.classList.toggle("cursor-on-field", !!field);
        // [data-cursor] 위에서는 원 · 점 대신 그 글자만 띄움 (사례 라이브러리 카드)
        const lens = !field && t.closest && t.closest("[data-cursor]");
        document.documentElement.classList.toggle("cursor-lens", !!lens);
        if (lens && label.textContent !== lens.dataset.cursor) label.textContent = lens.dataset.cursor;
        if (!raf) raf = requestAnimationFrame(frame);
      },
      { passive: true },
    );
    document.addEventListener("mouseleave", function () {
      document.documentElement.classList.remove("cursor-visible");
    });
    window.addEventListener("pointerdown", function () {
      document.documentElement.classList.add("cursor-down");
    });
    window.addEventListener("pointerup", function () {
      document.documentElement.classList.remove("cursor-down");
    });
  }

  /* ---------- 2. 고정 장면 ---------- */
  const stories = Array.from(document.querySelectorAll("[data-story]"));

  function updateStories() {
    stories.forEach(function (s) {
      const steps = s.querySelectorAll(".story-step");
      if (!steps.length) return;
      const n = steps.length;
      s.style.setProperty("--n", String(n));
      const r = s.getBoundingClientRect();
      const total = s.offsetHeight - window.innerHeight;
      const p = total > 0 ? clamp(-r.top / total) : 1;
      const idx = Math.min(n - 1, Math.floor(p * n));
      steps.forEach(function (st, i) {
        st.classList.toggle("is-active", i === idx);
        st.classList.toggle("is-past", i < idx);
      });
      const bar = s.querySelector(".story-bar");
      if (bar) bar.style.transform = "scaleX(" + p.toFixed(3) + ")";
      const cur = s.querySelector("[data-story-current]");
      if (cur) cur.textContent = String(idx + 1).padStart(2, "0");
      const all = s.querySelector("[data-story-total]");
      if (all) all.textContent = String(n).padStart(2, "0");
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      updateStories();
    });
  }

  document.addEventListener("lp:langchange", function () {
    updateStories();
  });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  initCursor();
})();

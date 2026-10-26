/* ==========================================================
   홈 오른쪽 가장자리 진행선 (스타일은 pages.css의 .bg-rail).
   - 구역(첫 화면 · 회사 소개 · 서비스 · 진행 사례 · 진행 방식 · 비용 · 인사이트 · 문의)마다 눈금 하나, **구역의 실제 길이에 맞춰 불규칙한 간격**으로 놓임
   - 스크롤하면 선이 금빛으로 차오름(지금 구역 안에서의 위치까지 이어서 계산)
   - 선의 **마우스를 올린 눈금 옆에만** 작은 이름표가 튀어나오고(키보드 초점 · 터치 누르기도 그 눈금만), 누르면 그 구역으로 부드럽게 이동
   - 이름은 번역 파일에서 읽음(home.bg.labels), 언어를 바꾸면 다시 씀
   ========================================================== */
(function () {
  "use strict";
  if (!document.querySelector("[data-rail]")) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const t = function (k) {
    return (window.LP_I18N && LP_I18N.t(k)) || "";
  };
  const SELECTORS = [".hero", ".about", ".svc", ".lib-section", ".story", ".price-line", ".jr", ".closing"];
  const KEYS = ["top", "about", "services", "cases", "process", "pricing", "insights", "contact"];

  const rail = document.createElement("nav");
  rail.className = "bg-rail";
  const line = document.createElement("span");
  line.className = "bg-rail-line";
  const fill = document.createElement("span");
  fill.className = "bg-rail-fill";
  line.appendChild(fill);
  rail.appendChild(line);
  const secs = [];
  const ticks = [];
  SELECTORS.forEach(function (sel, i) {
    const el = document.querySelector(sel);
    if (!el) return;
    secs.push(el);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "bg-rail-tick";
    b.dataset.k = KEYS[i];
    b.appendChild(document.createElement("span"));
    ticks.push(b);
    rail.appendChild(b);
  });
  document.body.appendChild(rail);

  // 눈금 위치: 구역의 실제 길이에 맞춰(스크롤 위치 비율) 놓음. 너무 붙으면 최소 간격(16px)을 벌림
  let P = [];
  function layout() {
    const total = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const h = rail.getBoundingClientRect().height || 1;
    const gap = 16 / h;
    P = secs.map(function (s) {
      return Math.max(0, Math.min(1, (s.getBoundingClientRect().top + scrollY) / total));
    });
    for (let i = 1; i < P.length; i++) if (P[i] < P[i - 1] + gap) P[i] = P[i - 1] + gap;
    const over = P[P.length - 1] - 1;
    if (over > 0) for (let i = 0; i < P.length; i++) P[i] -= over * (i / (P.length - 1));
    ticks.forEach(function (b, i) {
      b.style.top = P[i] * 100 + "%";
    });
  }

  function paint() {
    const labels = (window.LP_I18N && LP_I18N.get("home.bg.labels")) || {};
    rail.setAttribute("aria-label", t("home.bg.rail"));
    ticks.forEach(function (b) {
      const name = labels[b.dataset.k] || b.dataset.k;
      b.firstChild.textContent = name;
      b.setAttribute("aria-label", name);
    });
  }

  let queued = false;
  function frame() {
    queued = false;
    const probe = scrollY + innerHeight * 0.4;
    let idx = 0;
    secs.forEach(function (s, i) {
      if (s.getBoundingClientRect().top + scrollY <= probe) idx = i;
    });
    const top = secs[idx].getBoundingClientRect().top + scrollY;
    const next = secs[idx + 1] ? secs[idx + 1].getBoundingClientRect().top + scrollY : top + secs[idx].offsetHeight;
    const frac = Math.max(0, Math.min(1, (probe - top) / Math.max(1, next - top)));
    const pos = P.length ? (idx < P.length - 1 ? P[idx] + (P[idx + 1] - P[idx]) * frac : P[idx] + (1 - P[idx]) * frac) : 0;
    fill.style.transform = "scaleY(" + Math.min(1, pos).toFixed(4) + ")";
    ticks.forEach(function (b, i) {
      b.classList.toggle("is-past", i <= idx);
      b.classList.toggle("is-current", i === idx);
    });
  }
  function relayout() {
    layout();
    queue();
  }
  function queue() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(frame);
    }
  }
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", relayout);
  window.addEventListener("load", relayout);

  rail.addEventListener("click", function (e) {
    const b = e.target.closest(".bg-rail-tick");
    if (!b) return;
    const i = ticks.indexOf(b);
    const y = i === 0 ? 0 : secs[i].getBoundingClientRect().top + scrollY - 40;
    window.scrollTo({ top: y, behavior: reduce.matches ? "auto" : "smooth" });
  });
  // 터치: 선을 한 번 누르면 이름표가 열리고, 다른 곳을 누르면 닫힘
  rail.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "touch") rail.classList.add("is-open");
  });
  document.addEventListener("pointerdown", function (e) {
    if (!rail.contains(e.target)) rail.classList.remove("is-open");
  });

  document.addEventListener("lp:langchange", function () {
    paint();
    setTimeout(relayout, 600);
  });
  paint();
  layout();
  frame();
  setTimeout(relayout, 1500);
})();

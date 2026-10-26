/* ==========================================================
   페이지 상호작용
   1) 펼치기: [data-accordion] 안의 버튼이 바로 다음 패널을 열고 닫음 (서비스 · 질문)
   2) 거르기: data-filter 버튼으로 목록(data-tags)을 방향·주제별로 거름 (사례 갤러리 · 인사이트)
   ========================================================== */
(function () {
  "use strict";

  /* ---------- 1. 펼치기 ---------- */
  document.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-accordion] [aria-expanded][aria-controls]");
    if (!btn) return;
    const panel = document.getElementById(btn.getAttribute("aria-controls"));
    const next = btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", next ? "true" : "false");
    if (panel) panel.classList.toggle("is-open", next);
  });

  // 번역 목록 안의 펼치기 버튼은 템플릿에서 같은 id를 가지므로, 그린 뒤 순서대로 이름을 붙여 줌
  function linkPanels() {
    document.querySelectorAll("[data-accordion]").forEach(function (box, b) {
      box.querySelectorAll("[aria-controls]").forEach(function (btn, i) {
        const panel = btn.closest("[data-gen], li, article").querySelector(".acc-panel");
        if (!panel) return;
        panel.id = "acc-" + b + "-" + i;
        btn.setAttribute("aria-controls", panel.id);
        panel.classList.toggle("is-open", btn.getAttribute("aria-expanded") === "true");
      });
    });
    // 주소의 #id로 들어오면 그 항목을 펼친 채로 (예: services.html#diagnostic)
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      const btn = target && target.querySelector("[aria-controls]");
      if (btn && btn.getAttribute("aria-expanded") !== "true") {
        btn.click();
        // 목록이 그려지기 전에 브라우저가 이미 스크롤했으므로 다시 맞춤
        target.scrollIntoView({ block: "start" });
      }
    }
  }
  document.addEventListener("lp:langchange", linkPanels);

  /* ---------- 2. 거르기 ---------- */
  document.querySelectorAll("[data-filter-for]").forEach(function (bar) {
    const list = document.getElementById(bar.dataset.filterFor);
    if (!list) return;
    let current = "all";

    function apply() {
      bar.querySelectorAll("[data-filter]").forEach(function (b) {
        b.setAttribute("aria-pressed", b.dataset.filter === current ? "true" : "false");
      });
      let shown = 0;
      Array.from(list.children).forEach(function (item) {
        if (item.tagName === "TEMPLATE") return;
        const tags = (item.dataset.tags || "").split(" ");
        const on = current === "all" || tags.indexOf(current) !== -1;
        item.hidden = !on;
        // 배치 주기(data-slot 0–3): 거르면 보이는 것끼리 다시 셈 (사례 목록)
        if (on && list.hasAttribute("data-slots")) item.dataset.slot = String(shown % 4);
        if (on) shown += 1;
      });
      const count = document.querySelector("[data-filter-count='" + bar.dataset.filterFor + "']");
      if (count) count.textContent = String(shown);
    }

    bar.addEventListener("click", function (e) {
      const b = e.target.closest("[data-filter]");
      if (!b) return;
      current = b.dataset.filter;
      apply();
    });
    // 언어를 바꾸거나 목록이 새로 그려지면 고른 조건을 다시 적용
    document.addEventListener("lp:langchange", apply);
    document.addEventListener("lp:listchange", apply);
  });
})();

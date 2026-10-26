/* ==========================================================
   홈 인사이트(저널)를 그림. [data-journal] 칸 안에 가장 새 글(크게) · 이전 글 세 편 · 주제 줄을 만듦.
   글은 번역 파일의 insights.posts(앞 네 편)와 insights.featured(인용문 · 본문 첫 단락)에서 읽고,
   문구는 home.insights. 언어가 바뀌면 다시 그림. 등장 효과(data-reveal)는 main.js가 이어서 지켜봄 (CSS: pages.css 6-1)
   ========================================================== */
(function () {
  "use strict";
  const boxes = document.querySelectorAll("[data-journal]");
  if (!boxes.length) return;
  const ARROW = '<svg class="btn-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>';
  const t = function (key) {
    return LP_I18N.t(key) || "";
  };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function build() {
    const posts = LP_I18N.get("insights.posts") || [];
    if (!posts.length) return;
    const feat = LP_I18N.get("insights.featured") || {};
    const lead = posts[0];
    const day = (/(\d{4})\.(\d{2})\.(\d{2})/.exec(lead.date) || [])[3] || "";
    const ym = lead.date.replace(/\.\d{2}$/, "");
    const isFeat = feat.title && feat.title === lead.title;

    boxes.forEach(function (box) {
      box.textContent = "";

      // ① 가장 새 글
      const a = el("a", "jr-lead");
      a.href = "insights.html";
      a.dataset.reveal = "zoom";
      const badge = el("p", "jr-badge");
      badge.append(el("i", "live-dot"), t("home.insights.new"));
      const dateBlock = el("div", "jr-dateblock");
      const dayEl = el("span", "jr-day");
      dayEl.appendChild(el("span", null, day));
      const ymEl = el("span", "jr-ym");
      ymEl.append(el("b", null, ym), el("span", null, lead.category));
      dateBlock.append(dayEl, ymEl);
      const title = el("h3", "jr-lead-title");
      title.appendChild(el("span", "jr-ul", lead.title));
      a.append(badge, dateBlock, title);
      if (isFeat && feat.quote) a.appendChild(el("blockquote", "jr-quote", feat.quote));
      const first = isFeat && feat.body && feat.body[0] && feat.body[0].p && feat.body[0].p[0];
      a.appendChild(el("p", "jr-excerpt", first || lead.summary));
      const foot = el("div", "jr-foot");
      const go = el("span", "jr-go", t("home.insights.open"));
      go.insertAdjacentHTML("beforeend", ARROW);
      foot.append(el("span", "jr-time", t("home.insights.read") + " " + lead.read), go);
      a.appendChild(foot);
      box.appendChild(a);

      // ② 이전 글
      const aside = el("div", "jr-aside");
      aside.appendChild(el("span", "jr-label", t("home.insights.prev")));
      const ol = el("ol");
      posts.slice(1, 4).forEach(function (p, i) {
        const li = el("li", "jr-entry");
        li.dataset.reveal = "right";
        li.style.setProperty("--i", String(i));
        const link = el("a");
        link.href = "insights.html";
        const meta = el("p", "jr-meta");
        meta.append(el("span", null, p.date), el("span", null, p.category));
        const h = el("h3", "jr-entry-title");
        h.appendChild(el("span", "jr-ul", p.title));
        const body = el("div");
        body.append(meta, h, el("p", "jr-sum", p.summary));
        link.append(el("span", "jr-no", "0" + (i + 2)), body, el("span", "jr-time", p.read));
        li.appendChild(link);
        ol.appendChild(li);
      });
      aside.appendChild(ol);
      box.appendChild(aside);

      // ③ 주제 줄: 분류별 글 수
      const counts = {};
      posts.forEach(function (p) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      });
      const topics = el("div", "jr-topics");
      topics.dataset.reveal = "fade";
      topics.appendChild(el("span", "jr-label", t("home.insights.topics")));
      const ul = el("ul");
      Object.keys(counts).forEach(function (name) {
        const li = el("li");
        const link = el("a", null, name);
        link.href = "insights.html";
        link.appendChild(el("sup", null, String(counts[name])));
        li.appendChild(link);
        ul.appendChild(li);
      });
      topics.appendChild(ul);
      box.appendChild(topics);
    });
    document.dispatchEvent(new CustomEvent("lp:listchange"));
  }

  document.addEventListener("lp:langchange", build);
})();

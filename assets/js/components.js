/* 모든 페이지의 헤더 · 메뉴 서랍 · 푸터를 한 곳에서 만듭니다.
   문구는 data-i18n 키로만 넣고, 실제 글자는 i18n.js가 채웁니다. */
(function () {
  "use strict";
  const cfg = window.LP_CONFIG;
  const ARROW = '<svg class="btn-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>';

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c) node.appendChild(c);
    });
    return node;
  }

  // 글자 롤: 마우스를 올리면 같은 글자가 아래에서 굴러 올라옴 (components.css 6)
  function roll(key) {
    return el("span", { class: "roll" }, [el("span", { "data-i18n": key })]);
  }

  function currentPage() {
    const file = location.pathname.split("/").pop();
    return file === "" ? "index.html" : file;
  }

  function logo(src) {
    // 2줄 워드마크(LINKER / PARTNERS). 헤더는 화면 폭에 따라 크기 두 가지 중 하나
    const L = cfg.logo;
    const img = el("img", {
      src: (src || L.headerPc).src,
      width: String((src || L.headerPc).width),
      height: String((src || L.headerPc).height),
      alt: cfg.siteName,
    });
    if (src) return el("a", { class: "logo", href: "index.html" }, [img]);
    return el("a", { class: "logo", href: "index.html" }, [
      el("picture", {}, [
        el("source", {
          media: "(max-width: 640px)",
          srcset: L.headerMobile.src,
          width: String(L.headerMobile.width),
          height: String(L.headerMobile.height),
        }),
        img,
      ]),
    ]);
  }

  function langSwitch() {
    return el(
      "div",
      { class: "lang-switch", role: "group", "data-i18n-attr": "aria-label:lang.label" },
      cfg.supportedLangs.map(function (l) {
        return el("button", { type: "button", "data-lang": l, "aria-pressed": "false", text: l.toUpperCase() });
      }),
    );
  }

  // 헤더 언어 메뉴: 지구본 하나. 올리거나 누르면 지구본 자리에 영어 글자(Korean Japanese English)만 나타남 (components.css 3)
  const GLOBE = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M1.5 8h13M8 1.5c1.9 1.8 2.8 4 2.8 6.5S9.9 12.7 8 14.5M8 1.5C6.1 3.3 5.2 5.5 5.2 8s.9 4.7 2.8 6.5" /></svg>';
  function langMenu() {
    const list = el(
      "div",
      { class: "lang-list", id: "lang-list", role: "group", style: "--n:" + cfg.supportedLangs.length, "data-i18n-attr": "aria-label:lang.label" },
      cfg.supportedLangs.map(function (l, i) {
        return el("button", { type: "button", "data-lang": l, "aria-pressed": "false", lang: l, style: "--i:" + i }, [
          el("span", { class: "lang-name", text: cfg.langNames[l] }),
        ]);
      }),
    );
    const trigger = el("button", { class: "lang-trigger", type: "button", "aria-expanded": "false", "aria-controls": "lang-list", "data-i18n-attr": "aria-label:lang.label" });
    trigger.innerHTML = GLOBE;
    return el("div", { class: "lang-menu", "data-lang-menu": "", style: "--n:" + cfg.supportedLangs.length }, [trigger, list]);
  }

  // 언어 메뉴 열고 닫기: 마우스는 올리면 열리고 벗어나면 닫힘(닫힐 때만 120ms 여유),
  // 누르기 · 키보드는 버튼으로 열고 닫음. Esc · 바깥을 누르면 닫힘. 고르면 닫힘
  function bindLangMenu() {
    document.querySelectorAll("[data-lang-menu]").forEach(bindOne);
  }
  function bindOne(box) {
    const trigger = box.querySelector(".lang-trigger");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    let timer = 0;
    const set = function (open) {
      clearTimeout(timer);
      box.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", String(open));
    };
    box.addEventListener("pointerenter", function () {
      if (fine.matches) set(true);
    });
    box.addEventListener("pointerleave", function () {
      if (!fine.matches) return;
      timer = setTimeout(function () {
        set(false);
      }, 120);
    });
    trigger.addEventListener("click", function () {
      set(!box.classList.contains("is-open"));
    });
    box.querySelector(".lang-list").addEventListener("click", function (e) {
      if (e.target.closest("[data-lang]")) {
        set(false);
        trigger.focus({ preventScroll: true });
      }
    });
    document.addEventListener("click", function (e) {
      if (!box.contains(e.target)) set(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && box.classList.contains("is-open")) {
        set(false);
        trigger.focus();
      }
    });
  }

  function header() {
    return el("header", { class: "site-header" }, [
      el("div", { class: "container header-inner" }, [
        logo(),
        el("div", { class: "header-ticker", "data-ticker": "", role: "marquee" }),
        el("div", { class: "header-actions" }, [
          langMenu(),
          el("a", { class: "header-link", href: cfg.cta.href }, [roll(cfg.cta.key)]),
          el(
            "button",
            { class: "menu-toggle", type: "button", "aria-expanded": "false", "aria-controls": "site-menu" },
            [
              el("span", { class: "menu-toggle-label" }, [
                el("span", { "data-i18n": "nav.toggle" }),
                el("span", { "data-i18n": "nav.close", "aria-hidden": "true" }),
              ]),
              el("span", { class: "menu-toggle-lines", "aria-hidden": "true" }),
            ],
          ),
        ]),
      ]),
    ]);
  }

  // 메뉴 서랍: 오른쪽에서 나오는 흰 서랍
  // 위부터: 작은 라벨 · 페이지 메뉴(번호 · 이름 · 한 줄 설명) · 알림 줄(서울 · 도쿄 시각과 상담 가능 여부 · 오늘의 환율 · 최신 글) · 연락처 · 언어 · 상담 버튼
  function menu() {
    const page = currentPage();
    const items = cfg.nav.concat([{ key: "contact", href: cfg.cta.href }]).map(function (item, i) {
      const a = el("a", { href: item.href, html: ARROW }, []);
      a.prepend(el("span", { class: "menu-name", "data-i18n": "nav." + item.key }), el("span", { class: "menu-desc", "data-i18n": "menu.desc." + item.key }));
      if (item.href === page) a.setAttribute("aria-current", "page");
      return el("li", { style: "--i:" + i }, [a]);
    });

    return el(
      "div",
      { class: "menu", id: "site-menu", role: "dialog", "aria-modal": "true", "data-i18n-attr": "aria-label:nav.label" },
      [
        el("div", { class: "menu-backdrop", "data-menu-close": "" }),
        el("aside", { class: "menu-panel" }, [
          el("div", { class: "menu-inner" }, [
            el("p", { class: "menu-eyebrow" }, [el("i", { "aria-hidden": "true" }), el("span", { "data-i18n": "menu.eyebrow" })]),
            el("nav", { "data-i18n-attr": "aria-label:nav.label" }, [el("ul", { class: "menu-list" }, items)]),
            el("div", { class: "menu-info" }, [
              el("p", { class: "closing-clock menu-clock" }, [
                el("span", { class: "live-dot", "aria-hidden": "true" }),
                el("span", { "data-closing-status": "" }),
                el("span", { class: "closing-time num", "data-closing-time": "" }),
                el("span", { "data-i18n": "closing.info.clock" }),
              ]),
              el("p", { class: "menu-row menu-rate", hidden: "" }, [el("span", { class: "menu-label", "data-i18n": "menu.rate" }), el("span", { class: "num", "data-menu-rate": "" })]),
              el("a", { class: "menu-row menu-news", href: "insights.html" }, [el("span", { class: "menu-label", "data-i18n": "menu.news" }), el("span", { class: "menu-news-title", "data-i18n": "insights.featured.title" })]),
            ]),
            el("div", { class: "menu-foot" }, [
              el("div", { class: "menu-reach" }, [
                el("a", { class: "menu-mail", href: "mailto:" + cfg.email, text: cfg.email }),
                el("a", { class: "menu-tel", href: "tel:" + cfg.phone, text: cfg.phoneDisplay }),
                el("span", { class: "menu-label", "data-i18n": "menu.hours" }),
              ]),
              el("div", { class: "menu-side" }, [langSwitch(), el("a", { class: "btn btn--primary", href: cfg.cta.href, html: ARROW }, [])]),
            ]),
          ]),
        ]),
      ],
    );
  }

  // 메뉴의 오늘의 환율: 100엔이 몇 원인지. ticker.js가 저장해 둔 값이 있으면 쓰고, 없으면 한 번 받아 옴(받지 못하면 줄을 숨김)
  function menuRate() {
    const row = document.querySelector(".menu-rate");
    if (!row || row.dataset.done) return;
    row.dataset.done = "1";
    const show = function (krwPerJpy) {
      if (!krwPerJpy) return;
      row.querySelector("[data-menu-rate]").textContent = "100 JPY = " + (krwPerJpy * 100).toLocaleString("en", { maximumFractionDigits: 1 }) + " KRW";
      row.hidden = false;
    };
    try {
      const cached = JSON.parse(sessionStorage.getItem("lp_menu_rate") || "null");
      if (cached && Date.now() - cached.t < 3600000) return show(cached.v);
    } catch (e) {}
    fetch("https://api.frankfurter.dev/v1/latest?base=JPY&symbols=KRW")
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        const v = d && d.rates && d.rates.KRW;
        if (!v) return;
        try {
          sessionStorage.setItem("lp_menu_rate", JSON.stringify({ t: Date.now(), v: v }));
        } catch (e) {}
        show(v);
      })
      .catch(function () {});
  }

  function footer() {
    const page = currentPage();
    const links = cfg.footerNav.map(function (item) {
      const a = el("a", { href: item.href, html: ARROW }, []);
      a.prepend(el("span", { "data-i18n": "nav." + item.key }));
      if (item.href === page) a.setAttribute("aria-current", "page");
      return a;
    });
    // 긴 주소는 @ 앞에서만 줄이 바뀌도록
    const mail = el("a", { class: "footer-mail", href: "mailto:" + cfg.email });
    const at = cfg.email.indexOf("@");
    mail.append(cfg.email.slice(0, at), document.createElement("wbr"), cfg.email.slice(at));
    const tel = el("a", { class: "footer-tel", href: "tel:" + cfg.phone, text: cfg.phoneDisplay });

    // 한 띠(세 칸): 로고 · 소개 · SNS / 바로가기 / 연락처, 그 아래 저작권 + 맨 위로
    return el("footer", { class: "site-footer" }, [
      el("div", { class: "container" }, [
        el("div", { class: "footer-grid" }, [
          el("div", { class: "footer-brand", "data-reveal": "rise" }, [logo(cfg.logo.headerPc), el("p", { "data-i18n": "footer.description" }), social()]),
          el("nav", { class: "footer-menu", "data-reveal": "rise", style: "--d: 120ms", "data-i18n-attr": "aria-label:footer.links" }, [
            el("span", { class: "footer-label", "data-i18n": "footer.menu" }),
            el("div", { class: "footer-links" }, links),
          ]),
          el("div", { class: "footer-contact", "data-reveal": "rise", style: "--d: 240ms" }, [
            el("span", { class: "footer-label", "data-i18n": "footer.contact" }),
            mail,
            el("div", { class: "footer-facts" }, [tel, el("p", { class: "footer-hours", "data-i18n": "footer.hours" })]),
          ]),
        ]),
        el("div", { class: "footer-bottom" }, [
          el("small", { "data-i18n": "footer.copyright" }),
          el("a", { class: "footer-top-link", href: "#main", html: ARROW, "data-i18n-attr": "aria-label:footer.top" }),
        ]),
      ]),
    ]);
  }

  // SNS: 가는 원 안의 단색 로고. 주소(config.js social)가 비어 있으면 이동하지 않음
  const SOCIAL_ICON = {
    kakao:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.6c-5.1 0-9.2 3.2-9.2 7.2 0 2.6 1.7 4.8 4.3 6.1l-.9 3.4c-.1.3.2.5.5.4l4-2.6c.4 0 .8.1 1.3.1 5.1 0 9.2-3.2 9.2-7.2S17.1 3.6 12 3.6z" /><text x="12" y="12.9" text-anchor="middle" font-family="Newsreader, serif" font-size="4.6" font-weight="700" letter-spacing=".1" class="social-cut">TALK</text></svg>',
    instagram:
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r=".9" fill="currentColor" stroke="none" /></svg>',
    line:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" /><path class="social-cut-fill" d="M12 6.2c-3.7 0-6.7 2.4-6.7 5.4 0 2.7 2.4 4.9 5.6 5.3.3.1.6.2.5.6l-.1.9c0 .3-.2 1 .9.5s5.6-3.3 6.4-5c.4-.7.6-1.5.6-2.3 0-3-3-5.4-7.2-5.4z" /><text x="12" y="13.4" text-anchor="middle" font-family="Newsreader, serif" font-size="3.6" font-weight="700" fill="currentColor">LINE</text></svg>',
  };
  function social() {
    return el(
      "nav",
      { class: "footer-social", "data-i18n-attr": "aria-label:footer.social.label" },
      cfg.social.map(function (s) {
        const a = el("a", { class: "social-link", href: s.href || "#", "data-i18n-attr": "aria-label:footer.social." + s.id, "data-social": s.id });
        if (s.href) {
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener");
        } else a.addEventListener("click", function (e) {
          e.preventDefault();
        });
        a.innerHTML = SOCIAL_ICON[s.id] || "";
        return a;
      }),
    );
  }

  // data-config-href="email" 같은 요소에 설정값을 연결
  function bindConfig() {
    document.querySelectorAll("[data-config-href]").forEach(function (a) {
      const key = a.dataset.configHref;
      if (key === "email") a.href = "mailto:" + cfg.email;
      if (key === "phone" && cfg.phone) a.href = "tel:" + cfg.phone;
    });
    document.querySelectorAll("[data-config-text]").forEach(function (n) {
      const k = n.dataset.configText;
      n.textContent = (k === "phone" ? cfg.phoneDisplay : cfg[k]) || "";
    });
  }

  // 마무리의 실시간 서울 · 도쿄 시간(같은 시간대, UTC+9)과 상담 가능 표시: 평일 10:00–18:00이면 "지금 상담 가능"
  function tickClosing() {
    const nodes = document.querySelectorAll("[data-closing-time]");
    if (!nodes.length) return;
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const get = function (type) {
      const p = parts.find(function (x) {
        return x.type === type;
      });
      return p ? p.value : "";
    };
    const hh = Number(get("hour")) % 24;
    const open = ["Mon", "Tue", "Wed", "Thu", "Fri"].indexOf(get("weekday")) !== -1 && hh >= 10 && hh < 18;
    const t = window.LP_I18N ? LP_I18N.t.bind(LP_I18N) : function () { return ""; };
    nodes.forEach(function (n) {
      n.textContent = get("hour") + ":" + get("minute");
      const row = n.closest(".closing-clock");
      row.querySelector(".live-dot").classList.toggle("is-off", !open);
      row.querySelector("[data-closing-status]").textContent = t(open ? "closing.info.open" : "closing.info.closed") || "";
    });
  }
  document.addEventListener("lp:langchange", tickClosing);
  setInterval(tickClosing, 20000);

  // 마무리의 빠른 문의 폼: 입력을 확인한 뒤 메일 앱에 내용을 채워 엽니다 (문의 페이지의 폼과 같은 방식)
  function bindQuickForm() {
    const form = document.getElementById("quick-form");
    if (!form) return;
    const t = function (key) {
      return (window.LP_I18N && LP_I18N.t(key)) || "";
    };
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const hint = function (input) {
      return document.getElementById(input.getAttribute("aria-describedby"));
    };
    function check(input) {
      if (input.type === "checkbox") return input.checked ? "" : t("contact.form.error_consent");
      const v = input.value.trim();
      if (!v) return t("contact.form.error_required");
      if (input.type === "email" && !EMAIL_RE.test(v)) return t("contact.form.error_email");
      return "";
    }
    function mark(input, msg) {
      const field = input.closest(".field");
      if (field) field.classList.toggle("is-error", !!msg);
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      const h = hint(input);
      if (h) h.textContent = msg || "";
    }
    const inputs = function () {
      return form.querySelectorAll("input[required], textarea[required]");
    };
    form.addEventListener("input", function (e) {
      if (e.target.getAttribute("aria-invalid") === "true") mark(e.target, check(e.target));
    });
    form.addEventListener("change", function (e) {
      if (e.target.getAttribute("aria-invalid") === "true") mark(e.target, check(e.target));
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      let first = null;
      inputs().forEach(function (input) {
        const msg = check(input);
        mark(input, msg);
        if (msg && !first) first = input;
      });
      if (first) return first.focus();
      const el = form.elements;
      const opt = el.service.options[el.service.selectedIndex];
      const lines = [
        t("contact.form.name") + ": " + el.name.value.trim(),
        t("contact.form.email") + ": " + el.email.value.trim(),
        t("contact.form.services") + ": " + (el.service.value ? opt.textContent : "-"),
        "",
        el.message.value.trim(),
      ];
      window.location.href = "mailto:" + cfg.email + "?subject=" + encodeURIComponent(t("contact.form.mail_subject") + " " + el.name.value.trim()) + "&body=" + encodeURIComponent(lines.join("\n"));
    });
    document.addEventListener("lp:langchange", function () {
      form.querySelectorAll('[aria-invalid="true"]').forEach(function (input) {
        mark(input, check(input));
      });
    });
  }

  function render() {
    const h = document.getElementById("site-header");
    const f = document.getElementById("site-footer");
    if (h) h.replaceWith(el("a", { class: "skip-link", href: "#main", "data-i18n": "a11y.skip" }), header(), menu());
    if (f) f.replaceWith(footer());
    // 메뉴 안 상담 버튼: 아이콘 앞에 글자 롤
    const menuBtn = document.querySelector(".menu-side .btn");
    if (menuBtn) menuBtn.prepend(roll(cfg.cta.key));
    bindConfig();
    menuRate();
    bindLangMenu();
    bindQuickForm();
  }

  window.LP_COMPONENTS = { render: render };
})();

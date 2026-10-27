/* ==========================================================
   비용 표시 + 견적 계산기
   - 금액은 config.js의 pricing 한 곳에서만 읽습니다 (원 단위. 엔화는 환율로 바꿔 보여 줌).
   - data-price="items.diagnostic" + data-price-mode="from | plain | monthly | unit"
       경로가 단계(tiers)를 가리키면 가장 낮은 단계, "items.diagnostic.deep"처럼 끝까지 쓰면 그 금액.
       언어별 통화: 한국어 "15만 원", 일본어 "1.7万円"(1만 엔 아래는 "6,000円"), 영어 "₩150K · ¥17K"
   - #quick-est(홈): 서비스 하나 → 범위 · 수량 → 예상 비용 · 기간 (간단 견적).
   - #estimator: 항목 → 단계 → 수량을 고르면 줄별 금액 · 소계 · 빠른 진행 · 부가세 · 합계 ·
     기간 · 더 저렴한 패키지가 바로 계산됩니다. 문구는 번역 파일 pricing.estimator.items에서 읽습니다.
   ========================================================== */
(function () {
  "use strict";
  const P = window.LP_CONFIG.pricing;
  const t = function (key) {
    return LP_I18N.t(key) || "";
  };
  const lang = function () {
    return LP_I18N.lang();
  };

  /* ---------- 1. 금액 ---------- */
  // "items.diagnostic.deep"처럼 단계 이름을 바로 써도 tiers 안을 찾아 줌
  function resolve(path) {
    const node = path.split(".").reduce(function (o, k) {
      if (o == null) return o;
      if (o[k] == null && o.tiers && o.tiers[k] != null) return o.tiers[k];
      return o[k];
    }, P);
    if (typeof node === "number") return node;
    if (!node) return null;
    if (node.krw != null) return node.krw;
    if (node.unit != null) return node.unit;
    if (node.tiers) return Math.min.apply(null, Object.values(node.tiers));
    return null;
  }

  function trim(n) {
    return n.toLocaleString(lang() === "ja" ? "ja-JP" : "ko-KR", { maximumFractionDigits: 1 });
  }
  function compact(n) {
    return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);
  }
  function yen(krw) {
    return Math.round((krw * P.jpyPerKrw) / 1000) * 1000;
  }

  // 원 금액 → 언어별 글자
  function money(krw) {
    if (lang() === "ja") return yen(krw) < 10000 ? trim(yen(krw)) + "円" : trim(yen(krw) / 10000) + "万円";
    if (lang() === "en") return "₩" + compact(krw) + " · ¥" + compact(yen(krw));
    return trim(krw / 10000) + "만\u00a0원";
  }

  function format(mode, krw) {
    const p = money(krw);
    const key = { from: "price.from", monthly: "price.monthly", unit: "price.unit" }[mode];
    return key ? t(key).replace("{p}", p) : p;
  }

  function paint() {
    document.querySelectorAll("[data-price]").forEach(function (n) {
      const krw = resolve(n.dataset.price);
      if (krw != null) n.textContent = format(n.dataset.priceMode || "from", krw);
    });
    build();
    quickBuild();
  }

  /* ---------- 2. 견적 계산기 ---------- */
  const form = document.getElementById("estimator");
  const list = form && form.querySelector("[data-est-items]");
  // 고른 상태: { id: { on, tier, qty } } (언어를 바꿔도 · 새로고침해도 · 뒤로 갔다 와도 그대로: 이 창의 sessionStorage에 저장)
  const SAVED = "lp_est_v1";
  const state = (function () {
    try {
      const v = JSON.parse(sessionStorage.getItem(SAVED) || "null");
      return v && typeof v === "object" ? v : {};
    } catch (e) {
      return {};
    }
  })();
  function save() {
    try {
      sessionStorage.setItem(SAVED, JSON.stringify(state));
    } catch (e) {}
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function stepper(id, q) {
    const box = el("span", "stepper");
    const less = el("button", null, "−");
    const more = el("button", null, "+");
    const out = el("output");
    less.type = more.type = "button";
    less.dataset.qty = "-1";
    more.dataset.qty = "1";
    less.dataset.item = more.dataset.item = id;
    less.setAttribute("aria-label", t("pricing.estimator.less") + " · " + q.label);
    more.setAttribute("aria-label", t("pricing.estimator.more") + " · " + q.label);
    out.setAttribute("aria-live", "polite");
    out.dataset.qtyOut = id;
    box.append(less, out, more);
    return box;
  }

  // 번역 파일의 항목 정의로 계산기 줄을 그림
  function build() {
    if (!list) return;
    const items = LP_I18N.get("pricing.estimator.items") || [];
    list.textContent = "";
    items.forEach(function (it) {
      const cfg = P.items[it.id] || {};
      const s = (state[it.id] = state[it.id] || {
        on: false,
        tier: cfg.tiers ? Object.keys(cfg.tiers)[0] : null,
        qty: it.qty ? it.qty.start : 0,
      });
      // 저장된 값이 지금 가격표와 맞지 않으면(단계 이름 · 수량 범위가 바뀐 경우) 기본값으로
      if (cfg.tiers && !(s.tier in cfg.tiers)) s.tier = Object.keys(cfg.tiers)[0];
      if (it.qty) s.qty = Math.min(it.qty.max, Math.max(it.qty.min, Number(s.qty) || it.qty.start));
      s.on = !!s.on;

      const row = el("div", "est-item");
      row.dataset.id = it.id;

      const opt = el("label", "est-opt");
      const box = el("input");
      box.type = "checkbox";
      box.name = "svc";
      box.value = it.id;
      box.checked = s.on;
      const text = el("span", "est-text");
      text.append(el("span", "est-name", it.title), el("span", "est-desc", it.desc));
      // 줄 오른쪽 금액: 번역 파일의 mode가 있으면 그것, 없으면 금액 구조에 맞춰
      const mode = it.mode || (cfg.monthly ? "monthly" : cfg.unit != null ? "unit" : cfg.tiers ? "from" : "plain");
      const from = el("span", "est-price", format(mode, resolve("items." + it.id)));
      opt.append(box, el("span", "est-dot"), text, from);
      opt.querySelector(".est-dot").setAttribute("aria-hidden", "true");

      // 고르면 펼쳐지는 칸: 단계 + 수량
      const panel = el("div", "est-config acc-panel" + (s.on ? " is-open" : ""));
      const inner = el("div", "acc-inner");
      const body = el("div", "est-config-body acc-body");
      if (it.tiers && cfg.tiers) {
        const group = el("div", "est-tiers");
        group.setAttribute("role", "radiogroup");
        group.setAttribute("aria-label", it.title);
        it.tiers.forEach(function (tier) {
          const lab = el("label", "est-tier");
          const r = el("input");
          r.type = "radio";
          r.name = "tier-" + it.id;
          r.value = tier.v;
          r.checked = s.tier === tier.v;
          r.dataset.item = it.id;
          const amount = cfg.tiers[tier.v];
          lab.append(r, el("span", "est-tier-name", tier.name), el("span", "est-tier-price", cfg.monthly ? format("monthly", amount) : money(amount)), el("span", "est-tier-desc", tier.desc));
          group.appendChild(lab);
        });
        body.appendChild(group);
      }
      if (it.qty) {
        const q = el("div", "est-qty");
        const label = el("span", "est-qty-label");
        label.append(el("span", null, it.qty.label));
        q.append(label, stepper(it.id, it.qty));
        body.appendChild(q);
      }
      inner.appendChild(body);
      panel.appendChild(inner);
      row.append(opt, panel);
      list.appendChild(row);
    });
    estimate();
  }

  // 수량 한 항목의 정의 (번역 파일)
  function qtyDef(id) {
    const it = (LP_I18N.get("pricing.estimator.items") || []).filter(function (x) {
      return x.id === id;
    })[0];
    return it && it.qty;
  }

  // 고른 것 → 줄별 금액
  function lines() {
    const items = LP_I18N.get("pricing.estimator.items") || [];
    const out = [];
    items.forEach(function (it) {
      const s = state[it.id];
      const cfg = P.items[it.id];
      if (!s || !s.on || !cfg) return;
      const tierName = it.tiers && s.tier ? " · " + (it.tiers.filter((x) => x.v === s.tier)[0] || {}).name : "";
      const q = it.qty;
      const qtyText = q ? " · " + s.qty + q.unit : "";
      let amount = 0;
      if (cfg.tiers) amount = cfg.tiers[s.tier];
      else if (cfg.krw != null) amount = cfg.krw;
      if (cfg.unit != null) amount = cfg.unit * s.qty;
      if (cfg.monthly) amount = cfg.tiers[s.tier] * s.qty;
      out.push({ id: it.id, name: it.title + tierName + (cfg.unit != null || cfg.monthly ? qtyText : ""), amount: amount });
    });
    return out;
  }

  function weeks() {
    let min = 0;
    let max = 0;
    let ongoing = false;
    Object.keys(state).forEach(function (id) {
      const s = state[id];
      const cfg = P.items[id];
      if (!s.on || !cfg) return;
      if (cfg.monthly) ongoing = true;
      let w = cfg.weeks;
      if (w && !Array.isArray(w)) w = w[s.tier];
      if (!w) return;
      min = Math.max(min, w[0]);
      max += w[1];
    });
    // 여러 항목은 일부 겹쳐 진행하므로 최대 기간을 조금 줄여 잡음. 빠른 진행이면 4분의 3
    max = Math.max(min, Math.round(max * 0.8));
    if (form && form.elements.rush && form.elements.rush.checked) {
      min = Math.max(1, Math.round(min * 0.75));
      max = Math.max(min, Math.round(max * 0.75));
    }
    return { min: min, max: max, ongoing: ongoing };
  }

  // 고른 구성이 패키지 내용을 다 담고 있으면, 패키지로 맡길 때 얼마나 덜 드는지
  function packageHint() {
    const order = ["launch", "brand", "check"];
    for (let i = 0; i < order.length; i++) {
      const key = order[i];
      const pkg = P.packages[key];
      let covered = true;
      let listSum = 0;
      Object.keys(pkg.includes).forEach(function (id) {
        const need = pkg.includes[id];
        const cfg = P.items[id];
        const s = state[id];
        if (!s || !s.on) covered = false;
        if (typeof need === "number") {
          if (id !== "spot" && s && s.qty < need) covered = false;
          listSum += (cfg.unit != null ? cfg.unit : cfg.krw) * need;
        } else if (Array.isArray(need)) {
          if (s && s.qty < need[1]) covered = false;
          listSum += cfg.tiers[need[0]] * need[1];
        } else {
          listSum += cfg.tiers[need];
        }
      });
      if (covered && listSum > pkg.krw) return { key: key, save: listSum - pkg.krw };
    }
    return null;
  }

  function round(n, unit) {
    return Math.round(n / unit) * unit;
  }

  let summary = "";

  function estimate() {
    if (!form) return;
    // 수량 표시
    form.querySelectorAll("[data-qty-out]").forEach(function (o) {
      const q = qtyDef(o.dataset.qtyOut);
      o.textContent = state[o.dataset.qtyOut].qty + (q ? q.unit : "");
    });
    form.querySelectorAll(".est-item").forEach(function (row) {
      const on = state[row.dataset.id].on;
      row.classList.toggle("is-on", on);
      row.querySelector(".est-config").classList.toggle("is-open", on);
    });

    const ls = lines();
    const sub = ls.reduce(function (a, l) {
      return a + l.amount;
    }, 0);
    const rush = form.elements.rush && form.elements.rush.checked ? round(sub * P.rush, 10000) : 0;
    const vat = round((sub + rush) * P.vat, 1000);
    const total = sub + rush + vat;
    const empty = !ls.length;
    form.classList.toggle("is-empty", empty);

    const q = function (k) {
      return form.querySelector("[data-est='" + k + "']");
    };
    const box = q("lines");
    if (box) {
      box.textContent = "";
      if (empty) box.appendChild(el("li", "est-empty", t("pricing.estimator.empty")));
      ls.forEach(function (l) {
        const li = el("li");
        li.append(el("span", null, l.name), el("span", "est-line-price", money(l.amount)));
        box.appendChild(li);
      });
    }
    if (q("subtotal")) q("subtotal").textContent = empty ? "—" : money(sub);
    if (q("rush-row")) q("rush-row").hidden = !rush;
    if (q("rush")) q("rush").textContent = "+ " + money(rush);
    if (q("vat")) q("vat").textContent = empty ? "—" : money(vat);
    if (q("total")) q("total").textContent = empty ? "—" : money(total);

    const w = weeks();
    if (q("weeks")) {
      q("weeks").textContent = empty
        ? "—"
        : (w.max ? t("pricing.estimator.weeks").replace("{a}", String(w.min)).replace("{b}", String(w.max)) : "") +
          (w.ongoing ? (w.max ? " · " : "") + t("pricing.estimator.weeks_ongoing") : "");
    }
    const hint = packageHint();
    if (q("package-row")) q("package-row").hidden = !hint;
    if (q("package") && hint) {
      q("package").textContent = t("pricing.estimator.package_save")
        .replace("{name}", t("pricing.plans.names." + hint.key))
        .replace("{p}", money(hint.save));
    }

    // 문의 양식으로 넘길 요약
    summary = empty
      ? ""
      : [t("pricing.estimator.summary_head")]
          .concat(
            ls.map(function (l) {
              return "· " + l.name + " — " + money(l.amount);
            }),
          )
          .concat(rush ? ["· " + t("pricing.estimator.rush") + " — " + money(rush)] : [])
          .concat([t("pricing.estimator.total") + ": " + money(total) + " (" + t("pricing.estimator.vat_line") + ")"])
          .join("\n");
    if (q("cta")) {
      const ids = ls.map(function (l) {
        return l.id;
      });
      q("cta").href = "contact.html" + (empty ? "" : "?services=" + ids.join(",") + "&est=" + encodeURIComponent(summary));
    }
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
    });
    form.addEventListener("change", function (e) {
      const n = e.target;
      if (n.name === "svc") state[n.value].on = n.checked;
      if (n.type === "radio" && n.dataset.item) state[n.dataset.item].tier = n.value;
      save();
      estimate();
    });
    form.addEventListener("click", function (e) {
      const b = e.target.closest("[data-qty]");
      if (b) {
        const q = qtyDef(b.dataset.item);
        const s = state[b.dataset.item];
        s.qty = Math.min(q.max, Math.max(q.min, s.qty + Number(b.dataset.qty)));
        save();
        estimate();
      }
      const copy = e.target.closest("[data-est='copy']");
      if (copy && summary && navigator.clipboard) {
        navigator.clipboard.writeText(summary.replace(/ /g, " ")).then(function () {
          const label = copy.querySelector("[data-i18n]");
          if (!label) return;
          label.textContent = t("pricing.estimator.copied");
          setTimeout(function () {
            label.textContent = t("pricing.estimator.copy");
          }, 1800);
        });
      }
    });
  }

  /* ---------- 3. 홈 간단 견적 ----------
     서비스 하나 → (범위 또는 수량) → 예상 비용. 같은 금액(config.js)과 번역(pricing.estimator.items)을 씁니다.
     전체 항목 · 빠른 진행 · 패키지는 비용 페이지의 계산기에서. */
  const quick = document.getElementById("quick-est");
  const QUICK_IDS = ["spot", "diagnostic", "logo", "web", "booking", "sns", "localization", "channel"];
  const qs = { id: "diagnostic", tier: {}, qty: {} };

  function quickItems() {
    const all = LP_I18N.get("pricing.estimator.items") || [];
    // 시작 금액이 싼 것부터 (금액은 config.js에서 읽으므로 가격을 바꿔도 순서가 따라감)
    return QUICK_IDS.map(function (id) {
      return all.filter(function (x) {
        return x.id === id;
      })[0];
    })
      .filter(Boolean)
      .sort(function (x, y) {
        return resolve("items." + x.id) - resolve("items." + y.id);
      });
  }

  function chip(label, attr, value, on, radio) {
    const b = el("button", "qe-chip", label);
    b.type = "button";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", on ? "true" : "false");
    b.dataset[attr] = value;
    return b;
  }

  function quickBuild() {
    if (!quick) return;
    const body = quick.querySelector("[data-qe-body]");
    const items = quickItems();
    if (!items.length) return;
    const it = items.filter(function (x) {
      return x.id === qs.id;
    })[0] || items[0];
    const cfg = P.items[it.id];
    const focused = document.activeElement && quick.contains(document.activeElement) ? document.activeElement : null;
    const key = focused && (focused.dataset.qeId ? "qeId" : focused.dataset.qeTier ? "qeTier" : focused.dataset.qeQty ? "qeQty" : null);
    const keyVal = key && focused.dataset[key];

    body.textContent = "";

    // 1) 서비스 고르기
    const g1 = el("div", "qe-group");
    g1.append(el("p", "qe-legend", t("home.quick.pick")));
    const chips = el("div", "qe-chips");
    chips.setAttribute("role", "radiogroup");
    chips.setAttribute("aria-label", t("home.quick.pick"));
    items.forEach(function (x) {
      chips.appendChild(chip(x.title, "qeId", x.id, x.id === it.id));
    });
    g1.appendChild(chips);
    body.appendChild(g1);

    // 2) 범위(단계) 또는 수량
    let tier = null;
    let qty = 1;
    if (cfg.tiers && it.tiers) {
      tier = qs.tier[it.id] || it.tiers[0].v;
      const g2 = el("div", "qe-group");
      g2.append(el("p", "qe-legend", t("home.quick.tier")));
      const row = el("div", "qe-chips");
      row.setAttribute("role", "radiogroup");
      row.setAttribute("aria-label", t("home.quick.tier"));
      it.tiers.forEach(function (x) {
        row.appendChild(chip(x.name + " · " + money(cfg.tiers[x.v]), "qeTier", x.v, x.v === tier));
      });
      g2.appendChild(row);
      body.appendChild(g2);
    }
    if (cfg.unit != null && it.qty) {
      qty = qs.qty[it.id] != null ? qs.qty[it.id] : it.qty.start;
      const g3 = el("div", "qe-group");
      g3.append(el("p", "qe-legend", it.qty.label + " · " + format("unit", cfg.unit)));
      const box = el("span", "stepper");
      const less = el("button", null, "−");
      const more = el("button", null, "+");
      const out = el("output", null, qty + it.qty.unit);
      less.type = more.type = "button";
      less.dataset.qeQty = "-1";
      more.dataset.qeQty = "1";
      less.setAttribute("aria-label", t("pricing.estimator.less") + " · " + it.qty.label);
      more.setAttribute("aria-label", t("pricing.estimator.more") + " · " + it.qty.label);
      out.setAttribute("aria-live", "polite");
      box.append(less, out, more);
      g3.appendChild(box);
      body.appendChild(g3);
    }

    // 3) 결과
    let amount = 0;
    if (cfg.tiers) amount = cfg.tiers[tier];
    else if (cfg.unit != null) amount = cfg.unit * qty;
    else if (cfg.krw != null) amount = cfg.krw;
    const vat = round(amount * (1 + P.vat), 1000);
    let w = cfg.weeks;
    if (w && !Array.isArray(w)) w = w[tier];
    let weeksText = "";
    if (w) {
      weeksText = w[1] <= 1 ? t("home.quick.weeks_within") : w[0] >= w[1] ? t("home.quick.weeks_one").replace("{a}", String(w[1])) : t("pricing.estimator.weeks").replace("{a}", String(Math.max(1, w[0]))).replace("{b}", String(w[1]));
    }

    const res = el("div", "qe-result");
    res.setAttribute("aria-live", "polite");
    res.append(el("p", "qe-legend", t("home.quick.total")), el("p", "qe-total", money(amount)));
    const meta = el("p", "qe-meta", t("home.quick.vat").replace("{p}", money(vat)) + (weeksText ? " · " + t("home.quick.weeks") + " " + weeksText : ""));
    res.appendChild(meta);
    res.appendChild(el("p", "qe-note", t("home.quick.note")));
    const summary = [t("pricing.estimator.summary_head"), "· " + it.title + (tier ? " · " + it.tiers.filter(function (x) { return x.v === tier; })[0].name : "") + (cfg.unit != null && it.qty ? " · " + qty + it.qty.unit : "") + " — " + money(amount)].join("\n");
    const cta = el("a", "btn btn--primary");
    cta.href = "contact.html?services=" + it.id + "&est=" + encodeURIComponent(summary.replace(/\\n/g, "\n"));
    const roll = el("span", "roll");
    roll.appendChild(el("span", null, t("home.quick.cta")));
    cta.appendChild(roll);
    cta.insertAdjacentHTML("beforeend", '<svg class="btn-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>');
    res.appendChild(cta);
    body.appendChild(res);

    if (key) {
      const again = body.querySelector("[data-" + key.replace(/[A-Z]/g, function (m) { return "-" + m.toLowerCase(); }) + "='" + keyVal + "']");
      if (again) again.focus({ preventScroll: true });
    }
  }

  if (quick) {
    quick.addEventListener("click", function (e) {
      const c = e.target.closest("[data-qe-id], [data-qe-tier], [data-qe-qty]");
      if (!c) return;
      if (c.dataset.qeId) qs.id = c.dataset.qeId;
      if (c.dataset.qeTier) qs.tier[qs.id] = c.dataset.qeTier;
      if (c.dataset.qeQty) {
        const it = quickItems().filter(function (x) {
          return x.id === qs.id;
        })[0];
        const cur = qs.qty[qs.id] != null ? qs.qty[qs.id] : it.qty.start;
        qs.qty[qs.id] = Math.min(it.qty.max, Math.max(it.qty.min, cur + Number(c.dataset.qeQty)));
      }
      quickBuild();
    });
  }

  document.addEventListener("lp:langchange", paint);
  window.LP_PRICING = { money: money, format: format, resolve: resolve };
})();

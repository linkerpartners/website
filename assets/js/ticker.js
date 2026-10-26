/* ==========================================================
   헤더 가운데 환율 띠: 한국 · 일본 비즈니스에 쓰이는 환율을 옆으로 천천히 흘려 보냄 (.header-ticker)
   - 데이터: Frankfurter(유럽중앙은행 기준 환율, 키 없이 무료, 영업일 하루 한 번 갱신). 전일 대비 ▲ ▼ 함께.
     값은 USD 기준으로 받아 교차환율로 계산: USD/KRW · 100JPY/KRW · EUR/KRW · CNY/KRW · USD/JPY
   - 한 시간 동안 브라우저(sessionStorage)에 저장해 두고 쓰며, 받지 못하면 띠를 통째로 숨김 (가짜 값은 보여 주지 않음)
   - 올리면 멈춤, 1100px 이하와 동작 줄이기에서는 숨김 (CSS)
   ========================================================== */
(function () {
  "use strict";
  let box = null; // 헤더는 main.js가 그린 뒤에 생기므로 시작할 때 찾음
  const API = "https://api.frankfurter.dev/v1/";
  const KEY = "lp_fx_v1";
  const SYMS = "KRW,JPY,EUR,CNY";

  function iso(d) {
    return d.toISOString().slice(0, 10);
  }

  function load() {
    try {
      const c = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (c && Date.now() - c.t < 3600000) return Promise.resolve(c.d);
    } catch (e) {}
    const to = new Date();
    const from = new Date(Date.now() - 9 * 86400000);
    return fetch(API + iso(from) + ".." + iso(to) + "?base=USD&symbols=" + SYMS)
      .then(function (r) {
        if (!r.ok) throw new Error("fx");
        return r.json();
      })
      .then(function (d) {
        try {
          sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: d }));
        } catch (e) {}
        return d;
      });
  }

  const PAIRS = [
    { k: "usdkrw", id: "USD/KRW", f: function (r) { return r.KRW; }, dec: 1 },
    { k: "jpykrw", id: "100 JPY/KRW", f: function (r) { return (r.KRW / r.JPY) * 100; }, dec: 2 },
    { k: "eurkrw", id: "EUR/KRW", f: function (r) { return r.KRW / r.EUR; }, dec: 1 },
    { k: "cnykrw", id: "CNY/KRW", f: function (r) { return r.KRW / r.CNY; }, dec: 2 },
    { k: "usdjpy", id: "USD/JPY", f: function (r) { return r.JPY; }, dec: 2 },
  ];

  function build(d) {
    const days = Object.keys(d.rates).sort();
    if (days.length < 2) throw new Error("fx");
    const last = d.rates[days[days.length - 1]];
    const prev = d.rates[days[days.length - 2]];
    const track = document.createElement("div");
    track.className = "ticker-track";
    const label = (window.LP_I18N && LP_I18N.t("header.fx")) || "FX";
    let html = "";
    const names = (window.LP_I18N && LP_I18N.get("header.fxpairs")) || {};
    PAIRS.forEach(function (p) {
      const v = p.f(last);
      const c = v - p.f(prev);
      const pct = (c / p.f(prev)) * 100;
      const up = c >= 0;
      html +=
        '<span class="ticker-item"><span class="ticker-id">' +
        (names[p.k] || p.id) +
        '</span><span class="ticker-val num">' +
        v.toLocaleString("en-US", { minimumFractionDigits: p.dec, maximumFractionDigits: p.dec }) +
        '</span><span class="ticker-chg ' +
        (up ? "is-up" : "is-down") +
        '">' +
        (up ? "▲" : "▼") +
        " " +
        Math.abs(pct).toFixed(2) +
        "%</span></span>";
    });
    const date = days[days.length - 1].slice(5).replace("-", ".");
    html += '<span class="ticker-note num">' + label + " · " + date + "</span>";
    // 끊김 없이 흐르도록 같은 내용을 두 번 (두 번째는 화면 읽기에서 제외)
    track.innerHTML = '<span class="ticker-run">' + html + '</span><span class="ticker-run" aria-hidden="true">' + html + "</span>";
    box.textContent = "";
    box.appendChild(track);
    box.classList.add("is-ready");
  }

  // 언어를 바꾸면 이름 · 날짜 글자만 다시 그림(받아 둔 값을 그대로 씀)
  let data = null;
  function start() {
    box = document.querySelector("[data-ticker]");
    if (!box) return;
    if (data) return build(data);
    load()
      .then(function (d) {
        data = d;
        build(d);
      })
      .catch(function () {
        box.hidden = true;
      });
  }
  document.addEventListener("lp:langchange", start);
})();

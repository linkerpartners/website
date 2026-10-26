/* ==========================================================
   사례 라이브러리
   - 데이터: data/cases/index.json (보여 줄 순서) → data/cases/<id>/case.json (사례 하나, 세 언어)
     사례에는 사진이 없습니다. 목록(홈 · 사례 페이지)은 브랜드 이름만, 상세 맨 위 · 다음 사례 미리보기도 브랜드 이름만, 그 아래 숫자 카드 · 방향 선 · 일정 · 가격 막대로 정보를 줍니다.
     새 사례는 폴더를 만들고 index.json에 id만 더하면 됩니다.
     홈 라이브러리에는 index.json의 home에 적은 사례만 나옵니다(없으면 전부).
     (data/cases/README.md, data/cases/_template/case.json 참고)
   - [data-case-gallery] : 사례 갤러리 (사례 페이지). 영문 브랜드 이름만 적은 타일을 불규칙하게 놓고, 고르면 상세 보기가 열림
   - [data-case-library] : 사례 라이브러리 (홈). 카드 한 벌이 링 · 목록 · 슬라이드로 모양을 바꿈(avea.studio 실측). 카드 면은 영문 브랜드 이름만. 고르면 사례 페이지에서 그 사례가 열림
   - 상세 보기: 브랜드 이름 머리 → 머리말 · 본문과 붙어 있는 개요 · 진행 일정 · 다음 사례 미리보기가 상자 없이 이어짐.
     주소에 #case=<id>가 붙어 바로 열 수 있고, 뒤로 가기 · Esc로 닫힘. ← → 로 이전 · 다음 사례.
   ========================================================== */
(function () {
  "use strict";
  const DIR = window.LP_CONFIG.cases.dir;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const EASE = "cubic-bezier(0.77, 0, 0.175, 1)"; // --ease-curtain
  const EXPO = "cubic-bezier(0.16, 1, 0.3, 1)"; // --ease-expo
  const ARROW = '<svg class="btn-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>';
  const gallery = document.querySelector("[data-case-gallery]");
  const lib = document.querySelector("[data-case-library]");
  if (!gallery && !lib) return;

  let cases = [];
  let featured = []; // 홈 라이브러리에 보여 줄 사례 (index.json의 home)
  let viewer = null;
  let current = -1;
  let lastCard = null;
  let pushed = false; // 갤러리에서 열어 주소 기록을 하나 더했는지

  const t = function (key) {
    return LP_I18N.t(key) || "";
  };
  const L = function (c) {
    return c[LP_I18N.lang()] || c.ko || {};
  };
  const pick = function (v) {
    // 언어별 묶음({ko, ja, en})이면 지금 언어, 아니면 그대로
    return v && typeof v === "object" && !Array.isArray(v) ? v[LP_I18N.lang()] || v.ko || "" : v || "";
  };
  const route = function (c) {
    return c.route === "jp_kr" ? "JP → KR" : "KR → JP";
  };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null && text !== "") n.textContent = text;
    return n;
  }

  /* ---------- 0. 브랜드 이름 머리 (상세 맨 위 · 다음 사례 미리보기) ----------
     영문 브랜드 이름을 크게(폭에 맞춰 fitName) 두고, 위에는 사례 번호 · 방향 · 연도, 아래에는 금빛 짧은 선 · 한 줄 소개(short) ·
     업종 / 기간 / 고객을 작은 글씨로 더해 정보를 줌. next=true면 다음 사례 미리보기(고객 줄 없음, 움직임 없음) */
  const two = function (n) {
    return String(n).padStart(2, "0");
  };

  function nameHead(c, next) {
    const x = L(c);
    const i = cases.indexOf(c);
    const box = el("div", "namehead" + (next ? " namehead--next" : ""));
    const top = el("p", "nh-top");
    const no = next ? t("cases.labels.next") + " " + two(i + 1) + " / " + two(cases.length) : "CASE " + two(i + 1) + " / " + two(cases.length);
    top.append(el("span", "num", no), el("span", null, route(c) + " · " + c.year));
    const name = el("p", "namehead-name");
    name.appendChild(el("span", null, c.brand || x.short || x.title));
    const low = el("div", "nh-low");
    const facts = el("dl", "nh-facts");
    [
      ["industry", x.industry],
      ["period", x.duration],
      ["client", next ? "" : x.client],
    ].forEach(function (f) {
      if (!f[1]) return;
      const d = el("div");
      d.append(el("dt", null, t("cases.labels." + f[0])), el("dd", null, f[1]));
      facts.appendChild(d);
    });
    low.append(el("span", "nh-rule"), el("p", "nh-tag", x.short), facts);
    box.append(top, name, low);
    return box;
  }

  // 한 줄로 두고 폭의 70% · 높이의 26%를 넘지 않는 가장 큰 크기로 (위 · 아래 글줄 자리를 남김)
  function fitName(box) {
    const s = box.querySelector(".namehead-name > span");
    if (!s) return;
    const run = function () {
      if (!box.clientWidth) return;
      s.style.fontSize = "100px";
      const k = Math.min((box.clientWidth * (box.clientWidth < 700 ? 0.82 : 0.7)) / s.offsetWidth, (box.clientHeight * 0.26) / (s.offsetHeight || 105));
      s.style.fontSize = Math.max(18, Math.floor(100 * k)) + "px";
    };
    run();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
  }

  function fitAllNames() {
    if (viewer) viewer.querySelectorAll(".namehead").forEach(fitName);
  }

  function meta(c, extra) {
    const x = L(c);
    const p = el("p", "case-meta");
    p.append(el("span", "case-route", route(c)), el("span", null, x.industry), el("span", null, extra || x.duration));
    return p;
  }

  /* ---------- 1. 불러오기 ---------- */
  async function load() {
    const res = await fetch(DIR + "/index.json");
    const index = await res.json();
    const all = await Promise.all(
      (index.cases || []).map(function (id) {
        return fetch(DIR + "/" + id + "/case.json")
          .then(function (r) {
            return r.ok ? r.json() : null;
          })
          .then(function (c) {
            if (c) c.id = c.id || id;
            return c;
          })
          .catch(function () {
            console.warn("[cases] 사례를 읽지 못했습니다:", id);
            return null;
          });
      }),
    );
    cases = all.filter(Boolean);
    const home = (index.home || []).map(function (id) {
      return cases.filter(function (c) {
        return c.id === id;
      })[0];
    }).filter(Boolean);
    featured = home.length ? home : cases;
  }

  /* ---------- 2. 갤러리 (사례 페이지) ---------- */
  function card(c, i) {
    const x = L(c);
    const brand = c.brand || x.short || x.title;
    const li = el("li", "case-card");
    li.dataset.tags = c.route;
    li.dataset.tone = String(i % 3);
    li.dataset.slot = String(i % 4);
    li.style.setProperty("--i", String(Math.min(i % 4, 3)));
    li.setAttribute("data-reveal", i % 2 ? "right" : "left");
    const b = el("button", "case-open");
    b.type = "button";
    b.dataset.case = c.id;
    b.dataset.cursor = t("home.work.view");
    b.setAttribute("aria-label", brand + " · " + x.title);
    const face = el("span", "case-face");
    const mark = el("span", "case-mark", brand.charAt(0));
    mark.setAttribute("aria-hidden", "true");
    const top = el("span", "case-top");
    top.append(el("span", "case-no num", String(i + 1).padStart(2, "0")), el("span", "case-route", route(c)));
    const name = el("span", "case-brand");
    name.appendChild(el("span", "case-brand-in", brand));
    const foot = el("span", "case-foot");
    foot.append(el("span", "case-ind", x.industry), el("span", "case-peek", x.title));
    face.append(mark, top, name, foot);
    b.appendChild(face);
    li.appendChild(b);
    return li;
  }

  function renderGallery() {
    if (!gallery) return;
    gallery.textContent = "";
    cases.forEach(function (c, i) {
      gallery.appendChild(card(c, i));
    });
    // 거르기 · 등장 효과가 새 카드에도 적용되도록 알림 (site.js · main.js)
    document.dispatchEvent(new CustomEvent("lp:listchange"));
  }

  /* ---------- 3. 사례 라이브러리 (홈) ----------
     avea.studio 첫 화면 라이브러리의 움직임을 실측해 옮김 (DESIGN.md 7-1).
     카드 한 벌이 세 모양을 오가며, 매 프레임 '지금 위치(o, 카드 번호의 소수)'에 맞춰 다시 놓임.
     - 링: 원기둥(카드 사이 360/n°, 반지름 R)에 둘러선 카드. 끌면 관성(프레임마다 ×0.93)으로 돌다
       가장 가까운 카드로 빨려 들어감(5%씩). 세로로 끌면 링이 기울고(×0.18, 최대 14°) 놓으면 8%씩 돌아옴.
       빨리 돌수록 카드가 비스듬하고(skewX 최대 22°) 작아짐(최대 14%). 90°를 넘은 카드는 좌우를 뒤집어 글자가 바로 보이게.
       처음 화면에 들어오면 반지름이 0에서 4.5%씩 커지며 카드가 가운데에서 퍼져 나옴
     - 슬라이드: 가로 한 줄. 목록: 세로 기둥 + 이름 띠(가운데만 진하게) + 메타. 둘 다 목표(p)를 7.5%씩 따라감
     - 모양을 바꾸면 0.94초 동안 .is-switching: 같은 카드가 새 자리로 0.9초에 옮겨 감(--ease-morph)
     우리 결로 더한 것: 직각 카드(링 뒤쪽 카드도 흐리지 않음), 카드 면은 영문 브랜드 이름만(사진 · 그래프 없음),
     마우스를 올리면 커서 자리에 "보기"(data-cursor), 아래 설명 */
  const FRAME = 1000 / 60;
  const STEP_GAP = 16; // 슬라이드 · 목록에서 카드 사이
  let mode = "ring";
  let o = 0; // 지금 위치
  let p = 0; // 목표 위치 (슬라이드 · 목록)
  let aim = null; // 링에서 눌러 간 목표
  let vel = 0; // 링 관성
  let prevO = 0;
  let speed = 0; // 부드럽게 한 속도 (비스듬함 · 작아짐)
  let tilt = 0; // 링 기울기
  let spread = 0; // 링 펼침 0 → 1
  let spreadTo = 0;
  let shown = -1;
  let visible = false;
  let running = false;
  let lastT = 0;
  let switchTimer = 0;
  let wheelTimer = 0;
  let cards = [];
  let rows = [];
  let stage, ring, names, caption, openLink;
  let cw = 0; // 카드 폭
  let R = 0; // 링 반지름
  let pitchX = 0;
  let pitchY = 0;
  let rowH = 0;

  const num = function (i) {
    return String(i + 1).padStart(2, "0");
  };
  const wrap = function (i) {
    const n = featured.length;
    return ((i % n) + n) % n;
  };
  const clamp = function (v, a, b) {
    return Math.max(a, Math.min(b, v));
  };
  // 프레임 수가 달라도 같은 속도가 되도록: 60fps 기준 비율을 지난 시간만큼 거듭제곱
  const ease = function (a, k) {
    return 1 - Math.pow(1 - a, k);
  };
  // 카드 i까지 가장 가까운 방향으로 가는 위치
  function nearest(i, from) {
    const n = featured.length;
    let d = wrap(i - Math.round(from));
    if (d > n / 2) d -= n;
    return Math.round(from) + d;
  }

  function measure() {
    cw = stage.querySelector(".lib-frame").offsetWidth;
    pitchX = cw + STEP_GAP;
    pitchY = cw * 1.25 + STEP_GAP;
    rowH = rows[0] ? rows[0].offsetHeight : 36;
    // 링 반지름: 옆으로 가장 멀리 간 카드가 무대 안에 들어오게(원근 1600px), 카드 폭의 1.3–2.6배
    const a = stage.clientWidth / 2 - cw * 0.55;
    const fit = a > 0 ? (1600 * a) / Math.max(1600 - a, 200) : 0;
    R = clamp(fit, cw * 1.3, cw * 2.6);
  }

  // 카드 면: 영문 브랜드 이름만 (번호 · 첫 글자 윤곽 · 이름)
  function brandFace(c, i) {
    const x = L(c);
    const brand = c.brand || x.short || x.title;
    const face = el("span", "lib-bface");
    face.dataset.tone = String(i % 3);
    const mark = el("span", "lib-bmark", brand.charAt(0));
    mark.setAttribute("aria-hidden", "true");
    face.append(mark, el("span", "lib-bnum num", num(i)), el("span", "lib-bname", brand));
    return face;
  }

  function renderLibrary() {
    if (!lib) return;
    ring.textContent = "";
    names.textContent = "";
    cards = [];
    rows = [];
    featured.forEach(function (c, i) {
      const x = L(c);
      const a = el("a", "lib-card");
      a.href = "cases.html#case=" + c.id;
      a.dataset.index = i;
      a.draggable = false;
      a.setAttribute("aria-label", x.title);
      const fig = el("figure", "lib-media");
      fig.appendChild(brandFace(c, i));
      a.appendChild(fig);
      ring.appendChild(a);
      cards.push(a);
      const li = el("li");
      const name = el("a", "lib-name");
      name.href = "cases.html#case=" + c.id;
      name.dataset.index = i;
      const m = el("span", "lib-m-in");
      m.append(el("span", "lib-num", num(i)), " ", c.brand || x.short || x.title); // 라이브러리의 브랜드 이름은 언어와 관계없이 영어
      name.appendChild(m);
      li.appendChild(name);
      names.appendChild(li);
      rows.push(li);
    });
    lib.querySelector("[data-lib-total]").textContent = num(featured.length - 1);
    measure();
    shown = -1;
    layout();
    start();
  }

  // 매 프레임: 카드 · 이름 줄을 지금 위치(o)에 맞춰 놓음
  function layout() {
    const n = featured.length;
    const deg = 360 / n;
    const sk = clamp(speed * 55, -22, 22);
    const sc = 1 - Math.min(Math.abs(speed) * 1.4, 0.14);
    const half = stage.clientWidth / 2;
    const view = t("home.work.view");
    cards.forEach(function (c, i) {
      let d = i - o;
      d -= n * Math.round(d / n);
      let reach = true;
      if (mode === "ring") {
        const ang = d * deg;
        c.style.transform =
          "rotateY(" + ang.toFixed(2) + "deg) translateZ(" + (R * spread).toFixed(1) + "px) scale(" + sc.toFixed(3) + ") skewX(" + sk.toFixed(2) + "deg)" + (Math.abs(ang) > 90 ? " scaleX(-1)" : "");
        c.style.filter = "";
        c.style.opacity = "";
        c.style.zIndex = "";
        reach = Math.abs(ang) < 100;
      } else if (mode === "slider") {
        const r = d * pitchX;
        c.style.transform = "translateX(" + r.toFixed(1) + "px)";
        c.style.filter = "";
        c.style.opacity = "";
        c.style.zIndex = "";
        reach = Math.abs(r) < half;
      } else {
        const r = d * pitchY;
        const a = Math.abs(d);
        c.style.transform = "translateY(" + r.toFixed(1) + "px)";
        c.style.filter = "";
        c.style.opacity = clamp(1 - Math.max(0, a - 0.6) * 0.55, 0.12, 1).toFixed(3);
        c.style.zIndex = String(100 - Math.round(a * 10));
        reach = a < 1.5;
      }
      c.tabIndex = reach ? 0 : -1;
      // 커서 렌즈의 글자: 가운데 카드는 "보기", 옆 카드는 갈 방향
      const label = Math.abs(d) < 0.5 ? view : mode === "list" ? (d < 0 ? "↑" : "↓") : d < 0 ? "←" : "→";
      if (c.dataset.cursor !== label) c.dataset.cursor = label;
    });
    // 이름 띠: 가운데 줄만 진하고, 띠 끝에서 감겨 넘어가는 줄은 사라짐 (avea: 0.32 → 글자 대비를 위해 0.64)
    rows.forEach(function (li, i) {
      let d = i - o;
      d -= n * Math.round(d / n);
      const l = d * rowH;
      const u = Math.abs(l);
      const m = clamp(1 - u / (rowH / 2), 0, 1);
      const fade = clamp(((n * rowH) / 2 - u) / (rowH / 2), 0, 1);
      li.style.transform = "translateY(" + l.toFixed(1) + "px)";
      li.style.opacity = ((0.64 + 0.36 * m) * fade).toFixed(3);
    });
    const now = wrap(Math.round(o));
    if (now !== shown) select(now);
  }

  function tick(time) {
    if (!visible) {
      running = false;
      return;
    }
    const k = clamp((time - lastT) / FRAME || 1, 0.25, 4);
    lastT = time;
    if (reduce.matches) {
      o = mode === "ring" && aim !== null ? aim : mode === "ring" ? Math.round(o) : p;
      aim = null;
      vel = 0;
      spread = spreadTo;
    } else if (mode === "ring") {
      if (!dragging) {
        if (aim !== null) {
          o += (aim - o) * ease(0.12, k);
          vel = 0;
          if (Math.abs(aim - o) < 0.001) {
            o = aim;
            aim = null;
          }
        } else {
          o += vel * k;
          vel *= Math.pow(0.93, k);
          if (Math.abs(vel) < 0.02) {
            o += (Math.round(o) - o) * ease(0.05, k);
            if (Math.abs(vel) < 3e-5) vel = 0;
          }
        }
        tilt += (0 - tilt) * ease(0.08, k);
      }
      spread += (spreadTo - spread) * ease(0.045, k);
      if (Math.abs(spreadTo - spread) < 0.001) spread = spreadTo;
    } else {
      o += (p - o) * ease(0.075, k);
      if (Math.abs(p - o) < 5e-4) o = p;
    }
    if (mode === "ring") p = o;
    ring.style.transform = mode === "ring" ? "translateZ(" + (-R * spread).toFixed(1) + "px) rotateX(" + tilt.toFixed(2) + "deg)" : "";
    const dO = o - prevO;
    prevO = o;
    speed += (dO - speed) * ease(0.25, k);
    if (reduce.matches) speed = 0;
    layout();
    requestAnimationFrame(tick);
  }

  function start() {
    if (running || !visible || !cards.length) return;
    running = true;
    lastT = performance.now();
    requestAnimationFrame(tick);
  }

  // 지금 사례가 바뀌면: 번호 · 이름 띠 · 메타 · 이름표 · 아래 설명
  function select(i) {
    const first = shown === -1;
    shown = i;
    const c = featured[i];
    const x = L(c);
    lib.querySelector("[data-lib-current]").textContent = num(i);
    cards.forEach(function (n, k) {
      n.classList.toggle("is-active", k === i);
    });
    names.querySelectorAll(".lib-name").forEach(function (n) {
      if (Number(n.dataset.index) === i) n.setAttribute("aria-current", "true");
      else n.removeAttribute("aria-current");
    });
    // 가려졌다 올라오는 글자 (avea: 0.6초, 0.02 · 0.1 · 0.18초 간격)
    [
      ["cat", x.industry],
      ["svc", route(c) + " · " + x.duration],
      ["idx", num(i) + " / " + num(featured.length - 1)],
      ["snum", num(i)],
      ["sname", c.brand || x.short || x.title],
    ].forEach(function (f, k) {
      const box = lib.querySelector('[data-lib-m="' + f[0] + '"]');
      if (!box) return;
      box.textContent = f[1];
      if (!first && !reduce.matches) {
        box.animate([{ transform: "translateY(110%)" }, { transform: "none" }], { duration: 600, delay: [20, 100, 180, 20, 100][k], easing: EXPO, fill: "backwards" });
      }
    });
    caption.textContent = "";
    caption.append(meta(c), el("h3", "lib-caption-title", x.title));
    openLink.href = "cases.html#case=" + c.id;
    if (!first && !reduce.matches) {
      caption.animate(
        [
          { opacity: 0, filter: "blur(10px)", transform: "translateY(8px)" },
          { opacity: 1, filter: "blur(0)", transform: "none" },
        ],
        { duration: 700, easing: EXPO },
      );
    }
  }

  function go(step) {
    if (mode === "ring") {
      aim = (aim === null ? Math.round(o) : aim) + step;
      vel = 0;
    } else p = Math.round(p) + step;
    start();
  }

  function goTo(i) {
    if (mode === "ring") {
      aim = nearest(i, aim === null ? o : aim);
      vel = 0;
    } else p = nearest(i, p);
    start();
  }

  function setMode(m, instant) {
    if (m === mode) return;
    mode = m;
    lib.dataset.view = m;
    lib.querySelectorAll('[role="tab"]').forEach(function (b) {
      const on = b.dataset.view === m;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      if (on) stage.setAttribute("aria-labelledby", b.id);
    });
    vel = 0;
    speed = 0;
    aim = null;
    prevO = o;
    p = Math.round(o);
    if (!reduce.matches && !instant) {
      stage.classList.add("is-switching");
      clearTimeout(switchTimer);
      switchTimer = setTimeout(function () {
        stage.classList.remove("is-switching");
      }, 940);
    }
    start();
  }

  // 끌기 상태
  let dragging = false;
  let moved = false;
  let sx = 0;
  let sy = 0;
  let so = 0;
  let st = 0;
  let lastMoveT = 0;

  function bindLibrary() {
    stage = lib.querySelector(".lib-stage");
    ring = lib.querySelector("[data-lib-ring]");
    names = lib.querySelector("[data-lib-names]");
    caption = lib.querySelector("[data-lib-caption]");
    openLink = lib.querySelector("[data-lib-open]");
    if (reduce.matches) spread = spreadTo = 1;

    // 폰에서는 목록 보기만 (링 · 슬라이드는 폰에서 끊기고 카드가 튀는 문제가 있어 뺌. 탭도 CSS에서 숨김)
    const phone = window.matchMedia("(max-width: 640px)");
    const phoneOnlyList = function () {
      if (phone.matches) setMode("list", true);
    };
    phoneOnlyList();
    phone.addEventListener("change", phoneOnlyList);

    // 화면에 있을 때만 프레임을 돌림. 처음 들어오면 링이 펼쳐짐
    new IntersectionObserver(
      function (es) {
        visible = es[0].isIntersecting;
        if (visible && es[0].intersectionRatio > 0.2) spreadTo = 1;
        start();
      },
      { threshold: [0, 0.25] },
    ).observe(stage);

    // 탭: 누르기 · ← → 로 옮기기
    const tabs = Array.prototype.slice.call(lib.querySelectorAll('[role="tab"]'));
    tabs.forEach(function (b, k) {
      b.addEventListener("click", function () {
        setMode(b.dataset.view);
      });
      b.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const nb = tabs[(k + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        nb.focus();
        setMode(nb.dataset.view);
      });
    });
    lib.querySelectorAll("[data-lib-go]").forEach(function (b) {
      b.addEventListener("click", function () {
        go(Number(b.dataset.libGo));
      });
    });
    stage.addEventListener("keydown", function (e) {
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (!step || (mode !== "list" && (e.key === "ArrowUp" || e.key === "ArrowDown"))) return;
      e.preventDefault();
      go(step);
    });

    // 끌기: 링은 돌리고(세로로는 기울임), 슬라이드는 가로, 목록은 세로(마우스만. 손가락 세로는 페이지 스크롤)
    stage.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || e.target.closest(".lib-names")) return;
      dragging = true;
      moved = false;
      sx = e.clientX;
      sy = e.clientY;
      so = mode === "ring" ? o : p;
      st = tilt;
      aim = null;
      vel = 0;
    });
    window.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 6) {
        moved = true;
        stage.classList.add("is-dragging");
      }
      if (!moved) return;
      if (mode === "ring") {
        const no = so - dx / pitchX;
        vel = clamp(no - o, -0.5, 0.5);
        lastMoveT = e.timeStamp;
        o = no;
        if (e.pointerType === "mouse") tilt = clamp(st + dy * 0.18, -14, 14);
      } else if (mode === "slider") p = so - dx / pitchX;
      else if (e.pointerType === "mouse") p = so - dy / pitchY;
      start();
    });
    const release = function (e) {
      if (!dragging) return;
      dragging = false;
      // 손가락을 멈춘 채 떼면 관성 없음 (마지막 이동량이 남아 카드가 갑자기 튀는 것 방지)
      if (e && e.timeStamp - lastMoveT > 80) vel = 0;
      stage.classList.remove("is-dragging");
      if (mode !== "ring") p = Math.round(p);
      start();
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    // 카드 누르기: 끈 뒤면 무시, 가운데가 아니면 그 카드로, 가운데면 사례 열기
    ring.addEventListener("click", function (e) {
      const a = e.target.closest(".lib-card");
      if (!a) return;
      if (moved) {
        e.preventDefault();
        moved = false;
        return;
      }
      const i = Number(a.dataset.index);
      if (i !== shown) {
        e.preventDefault();
        goTo(i);
      }
    });
    ring.addEventListener("focusin", function (e) {
      const a = e.target.closest(".lib-card");
      if (a && a.matches(":focus-visible")) goTo(Number(a.dataset.index));
    });
    names.addEventListener("click", function (e) {
      const a = e.target.closest(".lib-name");
      if (!a) return;
      const i = Number(a.dataset.index);
      if (i !== shown) {
        e.preventDefault();
        goTo(i);
      }
    });
    names.addEventListener("focusin", function (e) {
      const a = e.target.closest(".lib-name");
      if (a) goTo(Number(a.dataset.index));
    });

    // 휠: 가로 방향만 가져감(세로는 페이지 스크롤). 링은 관성에 더하고, 나머지는 멈추면 가까운 카드로
    stage.addEventListener(
      "wheel",
      function (e) {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        aim = null;
        if (mode === "ring") vel += e.deltaX * 28e-5;
        else {
          p += e.deltaX * 0.0016;
          clearTimeout(wheelTimer);
          wheelTimer = setTimeout(function () {
            p = Math.round(p);
            start();
          }, 140);
        }
        start();
      },
      { passive: false },
    );

    let rz = 0;
    window.addEventListener("resize", function () {
      cancelAnimationFrame(rz);
      rz = requestAnimationFrame(function () {
        measure();
        start();
      });
    });
  }

  /* ---------- 4. 상세 보기 ---------- */
  function cv(n) {
    n.setAttribute("data-cv", "");
    return n;
  }

  /* ---------- 상세 보기의 숫자 그림 ----------
     metrics의 값 글자에서 알맞은 그림을 고름: 비중(%) → 게이지, 증가(+%) · 배수(×) · 100% 초과 → 기준 대 결과 막대, ¼ → 25% 게이지.
     그림으로 옮길 수 없는 값(금액 · 개수 · 연도)은 큰 숫자만 보여 주고, 숫자는 들어올 때 올라감 */
  function metricViz(raw) {
    const v = String(raw).replace(/\u2060/g, "").replace(/[,\s]/g, "");
    let m = v.match(/^~?(\d+(?:\.\d+)?)%$/);
    if (m) return +m[1] <= 100 ? { t: "gauge", p: +m[1] } : { t: "bars", base: 100, lo: +m[1], hi: +m[1], baseLabel: "100%" };
    m = v.match(/^\+(\d+(?:\.\d+)?)%$/);
    if (m) return { t: "bars", base: 100, lo: 100 + +m[1], hi: 100 + +m[1], baseLabel: "100%" };
    m = v.match(/^(\d+)(?:[–-](\d+))?×$/);
    if (m) return { t: "bars", base: 1, lo: +m[1], hi: +(m[2] || m[1]), baseLabel: "1×" };
    if (v === "¼") return { t: "gauge", p: 25 };
    return null;
  }

  function vizNode(z, shown) {
    const box = el("span", "mv mv--" + z.t);
    box.setAttribute("aria-hidden", "true");
    if (z.t === "gauge") {
      const tr = el("span", "mv-track mv-track--gauge");
      const fill = el("i", "mv-fill");
      fill.style.setProperty("--w", z.p + "%");
      tr.appendChild(fill);
      const sc = el("span", "mv-scale");
      ["0", "50", "100%"].forEach(function (n) {
        sc.appendChild(el("b", null, n));
      });
      box.append(tr, sc);
      return box;
    }
    const row = function (parts, label, hot) {
      const r = el("span", "mv-row");
      const tr = el("span", "mv-track");
      parts.forEach(function (p) {
        const b = el("i", "mv-bar" + (p.cls ? " " + p.cls : ""));
        b.style.setProperty("--w", ((p.v / z.hi) * 100).toFixed(2) + "%");
        tr.appendChild(b);
      });
      r.append(tr, el("b", hot ? "is-hot" : null, label));
      return r;
    };
    box.append(row([{ v: z.base, cls: "mv-bar--base" }], z.baseLabel), row([{ v: z.lo }].concat(z.hi > z.lo ? [{ v: z.hi - z.lo, cls: "mv-bar--ext" }] : []), shown, true));
    return box;
  }

  // 큰 숫자: "32,000+" · "4억+" · "25,000"처럼 앞부분이 숫자인 값만 0에서 올라감 (연도 · 범위 · 단위가 앞에 오는 값은 그대로)
  function countUp(n) {
    const txt = n.textContent;
    const m = txt.match(/^(\d[\d,]*(?:\.\d+)?)([^\d\u2060–\-×%\s]*)$/);
    if (!m || reduce.matches) return;
    const num = parseFloat(m[1].replace(/,/g, ""));
    if (!(num > 10) || (num >= 1900 && num <= 2100 && !m[2])) return;
    const dec = (m[1].split(".")[1] || "").length;
    const comma = m[1].indexOf(",") !== -1;
    const t0 = performance.now();
    const step = function (now) {
      const k = Math.min((now - t0) / 1100, 1);
      const e = 1 - Math.pow(1 - k, 4);
      const val = num * e;
      n.textContent = (comma ? val.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : val.toFixed(dec)) + m[2];
      if (k < 1) requestAnimationFrame(step);
      else n.textContent = txt;
    };
    n.textContent = "0" + m[2];
    requestAnimationFrame(step);
  }

  // [data-in] 요소가 상세 보기 스크롤 안에 들어오면 is-in을 붙여 그림이 그려지게 함
  let inObserver = null;
  function watchIn() {
    if (inObserver) inObserver.disconnect();
    const items = viewer.querySelectorAll("[data-in]");
    if (reduce.matches || !("IntersectionObserver" in window)) {
      items.forEach(function (n) {
        n.classList.add("is-in");
      });
      return;
    }
    inObserver = new IntersectionObserver(
      function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-in");
          const v = e.target.querySelector(".cv-metric-value");
          if (v) countUp(v);
          inObserver.unobserve(e.target);
        });
      },
      { root: viewer.querySelector(".cv-scroll"), threshold: 0.35 },
    );
    items.forEach(function (n) {
      inObserver.observe(n);
    });
  }

  function section(title, body, cls) {
    const s = cv(el("section", "cv-section" + (cls ? " " + cls : "")));
    s.append(el("h3", "cv-label", title), body);
    return s;
  }

  function svcNames() {
    // 서비스 id → 이름 (견적 계산기 항목 이름에 서비스 이름을 덮어씀)
    return (LP_I18N.get("pricing.estimator.items") || []).concat(LP_I18N.get("services.items") || []).reduce(function (m, s) {
      m[s.id] = s.title;
      return m;
    }, {});
  }

  // 이 사례에 쓰인 서비스를 지금 가격표 기준으로 맡기면: 서비스별 시작 금액 막대 + 합계 (config.js의 금액을 그대로 읽음)
  function similarPrice(c) {
    const P = window.LP_CONFIG.pricing.items;
    const names = svcNames();
    const rows = (c.services || [])
      .map(function (id) {
        const cfg = P[id];
        const krw = cfg ? window.LP_PRICING.resolve("items." + id) : null;
        if (krw == null) return null;
        const mode = cfg.monthly ? "monthly" : cfg.unit != null ? "unit" : cfg.tiers ? "from" : "plain";
        return { name: names[id] || id, krw: krw, mode: mode, monthly: !!cfg.monthly };
      })
      .filter(Boolean);
    if (!rows.length) return null;
    const max = Math.max.apply(
      null,
      rows.map(function (r) {
        return r.krw;
      }),
    );
    const box = el("div", "cv-price");
    box.setAttribute("data-in", "");
    rows.forEach(function (r, i) {
      const row = el("div", "cv-price-row");
      row.style.setProperty("--i", String(i));
      const bar = el("span", "cv-price-bar");
      const fill = el("i");
      fill.style.setProperty("--w", ((r.krw / max) * 100).toFixed(1) + "%");
      bar.appendChild(fill);
      row.append(el("span", "cv-price-name", r.name), bar, el("span", "cv-price-val num", window.LP_PRICING.format(r.mode, r.krw)));
      box.appendChild(row);
    });
    const once = rows.filter(function (r) {
      return !r.monthly;
    });
    if (once.length > 1) {
      const sum = once.reduce(function (a, r) {
        return a + r.krw;
      }, 0);
      const tot = el("p", "cv-price-total");
      tot.append(el("span", null, t("cases.labels.similarTotal")), el("b", "num", window.LP_PRICING.money(sum)));
      box.appendChild(tot);
    }
    box.appendChild(el("p", "cv-price-note", t("cases.labels.similarNote")));
    return section(t("cases.labels.similar"), box);
  }

  function fill(c) {
    const x = L(c);
    viewer.querySelector(".cv-scroll").scrollTop = 0;
    const sheet = viewer.querySelector(".cv-sheet");
    sheet.textContent = "";

    // 4-1. 맨 위는 브랜드 이름만 + 그 아래 머리말 (방향 · 업종 · 연도, 제목, 요약)
    const hero = el("header", "cv-hero");
    hero.appendChild(nameHead(c));
    sheet.appendChild(hero);
    fitName(hero.firstChild);
    const intro = cv(el("div", "container cv-intro"));
    const m = meta(c, c.year);
    intro.append(m, el("h2", "cv-title", x.title), el("p", "cv-summary", x.summary));
    sheet.appendChild(intro);

    // 4-2. 본문(왼쪽) + 붙어 있는 개요 카드(오른쪽)
    const body = el("div", "container cv-body");
    const main = el("div", "cv-main");
    if (c.metrics && c.metrics.length) {
      const ul = cv(el("ul", "cv-metrics"));
      ul.dataset.n = String(c.metrics.length);
      c.metrics.forEach(function (k, i) {
        const li = el("li", "cv-metric");
        li.setAttribute("data-in", "");
        li.style.setProperty("--i", String(i));
        const shown = pick(k.value);
        li.append(el("span", "cv-metric-value", shown));
        const z = metricViz(shown);
        if (z) li.appendChild(vizNode(z, shown));
        li.appendChild(el("span", "cv-metric-label", pick(k.label)));
        ul.appendChild(li);
      });
      main.appendChild(ul);
    }
    main.appendChild(section(t("cases.labels.challenge"), el("p", "cv-text", x.challenge)));
    const ol = el("ol", "cv-steps");
    (x.approach || []).forEach(function (s) {
      ol.appendChild(el("li", null, s));
    });
    main.appendChild(section(t("cases.labels.approach"), ol));
    const result = el("p", "cv-result", x.result);
    main.appendChild(section(t("cases.labels.result"), result));
    const price = similarPrice(c);
    if (price) main.appendChild(price);

    const aside = cv(el("aside", "cv-aside"));
    aside.appendChild(el("h3", "cv-aside-title", t("cases.labels.overview")));
    const rt = el("div", "cv-route");
    rt.setAttribute("aria-hidden", "true");
    rt.setAttribute("data-in", "");
    const ends = c.route === "jp_kr" ? ["JP", "KR"] : ["KR", "JP"];
    rt.append(el("span", "cv-pin", ends[0]), el("span", "cv-routeline"), el("span", "cv-pin", ends[1]));
    aside.appendChild(rt);
    const facts = el("dl", "cv-facts");
    [
      ["client", x.client],
      ["route", c.route ? t("cases.labels." + c.route) : ""],
      ["period", x.duration],
      ["budget", c.budget ? window.LP_PRICING.money(c.budget) : ""],
    ].forEach(function (row) {
      if (!row[1]) return;
      const d = el("div");
      d.append(el("dt", null, t("cases.labels." + row[0])), el("dd", null, row[1]));
      facts.appendChild(d);
    });
    aside.appendChild(facts);
    if (c.services && c.services.length) {
      const names = svcNames();
      const tags = el("ul", "cv-tags");
      tags.setAttribute("aria-label", t("cases.labels.services"));
      c.services.forEach(function (id) {
        tags.appendChild(el("li", "tag", names[id] || id));
      });
      aside.appendChild(tags);
    }
    const ask = el("a", "btn btn--primary");
    ask.href = "contact.html?services=" + (c.services || []).join(",");
    const roll = el("span", "roll");
    roll.appendChild(el("span", null, t("cases.labels.ask")));
    ask.appendChild(roll);
    ask.insertAdjacentHTML("beforeend", ARROW);
    aside.appendChild(ask);

    body.append(main, aside);
    sheet.appendChild(body);

    // 4-3. 진행 일정 (가로 단계) + 결과물
    const more = el("div", "container cv-band cv-more");
    if (x.timeline && x.timeline.length) {
      const tl = el("ol", "cv-timeline");
      tl.setAttribute("data-in", "");
      x.timeline.forEach(function (s) {
        const li = el("li");
        li.style.setProperty("--i", String(tl.children.length));
        li.append(el("span", "cv-when", s.when), el("span", "cv-what", s.what));
        tl.appendChild(li);
      });
      more.appendChild(section(t("cases.labels.timeline"), tl, "cv-section--wide"));
    }
    if (x.deliverables && x.deliverables.length) {
      const ul = el("ul", "dots cv-list");
      x.deliverables.forEach(function (d) {
        ul.appendChild(el("li", null, d));
      });
      more.appendChild(section(t("cases.labels.deliverables"), ul, "cv-section--wide"));
    }
    if (c.sources && c.sources.length) {
      const ul = el("ul", "cv-sources");
      c.sources.forEach(function (s) {
        const li = el("li");
        const a = el("a", "inline-link", pick(s.label));
        a.href = s.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        li.appendChild(a);
        ul.appendChild(li);
      });
      more.appendChild(section(t("cases.labels.sources"), ul, "cv-section--wide"));
    }
    if (c.example) more.appendChild(cv(el("p", "cv-note", t("cases.note"))));
    sheet.appendChild(more);

    // 4-4. 다음 사례 미리보기 + 이전 사례
    if (cases.length > 1) {
      const next = cases[(current + 1) % cases.length];
      const prev = cases[(current - 1 + cases.length) % cases.length];
      const foot = el("footer", "cv-next-wrap");
      const prevBtn = el("button", "text-link cv-prev");
      prevBtn.type = "button";
      prevBtn.dataset.go = "-1";
      prevBtn.append(el("span", null, t("cases.labels.prev") + " · " + L(prev).title));
      const nb = cv(el("button", "cv-next"));
      nb.type = "button";
      nb.dataset.go = "1";
      const nf = el("span", "cv-next-media");
      nf.appendChild(nameHead(next, true));
      const ng = el("span", "container cv-next-text");
      ng.append(el("span", "cv-next-label", t("cases.labels.next")), el("span", "cv-next-title", L(next).title));
      ng.insertAdjacentHTML("beforeend", ARROW);
      nb.append(nf, ng);
      const inner = el("div", "container");
      inner.append(prevBtn);
      foot.append(inner, nb);
      sheet.appendChild(foot);
      fitName(nf.firstChild);
    }

    viewer.setAttribute("aria-label", x.title);
    watchIn();
  }

  function build() {
    viewer = el("div", "case-viewer");
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-modal", "true");
    viewer.hidden = true;
    viewer.innerHTML =
      '<div class="cv-backdrop"></div>' +
      '<div class="cv-progress" aria-hidden="true"><span></span></div>' +
      '<div class="cv-scroll"><article class="cv-sheet"></article></div>' +
      '<button class="cv-close" type="button"><span class="cv-close-label"></span><span class="menu-toggle-lines" aria-hidden="true"></span></button>';
    document.body.appendChild(viewer);
    window.addEventListener("resize", fitAllNames);
    const scroller = viewer.querySelector(".cv-scroll");
    const bar = viewer.querySelector(".cv-progress span");
    scroller.addEventListener(
      "scroll",
      function () {
        const max = scroller.scrollHeight - scroller.clientHeight;
        bar.style.transform = "scaleX(" + (max > 0 ? scroller.scrollTop / max : 0).toFixed(3) + ")";
      },
      { passive: true },
    );
    // 갤러리에서 열었으면 뒤로 가기로 닫고(주소도 되돌림), 주소로 바로 들어왔으면 주소만 지우고 닫음
    viewer.querySelector(".cv-close").addEventListener("click", function () {
      if (pushed) {
        pushed = false;
        history.back();
      } else {
        history.replaceState(null, "", location.pathname + location.search);
        close();
      }
    });
    viewer.addEventListener("click", function (e) {
      const go = e.target.closest("[data-go]");
      if (go) show((current + Number(go.dataset.go) + cases.length) % cases.length, true);
    });
  }

  function setOutsideInert(on) {
    [document.getElementById("main"), document.querySelector(".site-footer"), document.querySelector(".site-header")].forEach(function (n) {
      if (n) n.inert = on;
    });
    document.documentElement.style.overflow = on ? "hidden" : "";
  }

  // 뒤 페이지: 상세가 열리면 초점이 빠지며 사라지고(html.cv-open, pages.css), 닫으면 흐림이 걷히며 다시 맺힘.
  // 닫을 때 화면 안의 글자(data-reveal)는 등장 전 상태로 순간 되돌린 뒤 위에서부터 차례로 다시 생겨남
  function veil(on) {
    const root = document.documentElement;
    if (on) {
      root.classList.add("cv-open");
      return;
    }
    if (!root.classList.contains("cv-open")) return;
    const items = reduce.matches
      ? []
      : Array.prototype.filter.call(document.querySelectorAll("#main [data-reveal].is-inview"), function (n) {
          const r = n.getBoundingClientRect();
          return r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
        });
    root.classList.add("cv-reset");
    items.forEach(function (n) {
      n.classList.remove("is-inview");
    });
    void root.offsetHeight; // 되돌린 상태를 한 번 그리고 나서
    root.classList.remove("cv-reset");
    root.classList.remove("cv-open");
    items.forEach(function (n, i) {
      setTimeout(function () {
        n.classList.add("is-inview");
      }, 160 + Math.min(i, 8) * 70);
    });
  }

  function rise(items, delay) {
    items.forEach(function (n, i) {
      n.animate(
        [
          { opacity: 0, transform: "translateY(32px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 900, delay: delay + Math.min(i, 6) * 70, easing: EXPO, fill: "backwards" },
      );
    });
  }

  // 열기: 배경이 맺히고 머리부터 차례로 올라옴
  function grow() {
    const items = viewer.querySelectorAll("[data-cv], .cv-close, .namehead");
    viewer.classList.add("is-open");
    fitAllNames();
    viewer.querySelector(".cv-backdrop").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: "ease-out" });
    if (reduce.matches) {
      viewer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: "ease-out" });
      return;
    }
    rise(items, 160);
  }

  function show(i, swap) {
    if (!viewer) build();
    current = i;
    const c = cases[i];
    if (swap) {
      // 이전 · 다음: 내용이 살짝 흐려졌다가 바뀜
      const sheet = viewer.querySelector(".cv-sheet");
      sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-in", fill: "forwards" }).onfinish = function () {
        fill(c);
        sheet.animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 700, easing: EXPO, fill: "forwards" });
      };
      history.replaceState(null, "", "#case=" + c.id);
      return;
    }
    fill(c);
    viewer.hidden = false;
    viewer.querySelector(".cv-scroll").scrollTop = 0; // 숨겨진 동안에는 스크롤을 되돌릴 수 없어서 보인 뒤에
    setOutsideInert(true);
    veil(true);
    requestAnimationFrame(function () {
      grow();
      viewer.querySelector(".cv-close").focus({ preventScroll: true });
    });
  }

  function close() {
    if (!viewer || viewer.hidden) return;
    const done = function () {
      viewer.hidden = true;
      viewer.classList.remove("is-open");
      setOutsideInert(false);
      if (lastCard) lastCard.querySelector(".case-open").focus({ preventScroll: true });
    };
    if (reduce.matches) {
      veil(false);
      return done();
    }
    // 상세가 내려가며 사라지는 동안(0.5초) 뒤 페이지가 맺히기 시작 → 두 장면이 겹쳐 이어짐
    const anim = viewer.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(20px)" }], { duration: 500, easing: "cubic-bezier(0.4, 0, 0.2, 1)" });
    setTimeout(function () {
      veil(false);
    }, 120);
    anim.onfinish = done;
  }

  function openById(id, push) {
    const i = cases.findIndex(function (c) {
      return c.id === id;
    });
    if (i === -1) return;
    lastCard = gallery ? gallery.querySelector('[data-case="' + id + '"]') : null;
    if (lastCard) lastCard = lastCard.closest(".case-card");
    if (push) {
      history.pushState(null, "", "#case=" + id);
      pushed = true;
    }
    show(i, false);
  }

  function fromHash() {
    const m = location.hash.match(/case=([\w-]+)/);
    if (m) {
      if (!viewer || viewer.hidden) openById(m[1], false);
    } else close();
  }

  /* ---------- 5. 시작 ---------- */
  let ready = false;
  function render() {
    if (!ready) return;
    renderGallery();
    renderLibrary();
    if (viewer && !viewer.hidden && current > -1) fill(cases[current]);
  }

  const loading = load().then(function () {
    ready = true;
  });
  document.addEventListener("lp:langchange", function () {
    loading.then(function () {
      render();
      if (gallery) {
        if (!viewer) build();
        viewer.querySelector(".cv-close-label").textContent = t("cases.labels.close");
        fromHash();
      }
    });
  });

  if (lib) bindLibrary();

  if (gallery) {
    gallery.addEventListener("click", function (e) {
      const b = e.target.closest(".case-open");
      if (b) openById(b.dataset.case, true);
    });
    window.addEventListener("popstate", fromHash);
    document.addEventListener("keydown", function (e) {
      if (!viewer || viewer.hidden) return;
      if (e.key === "Escape") viewer.querySelector(".cv-close").click();
      if (e.key === "ArrowRight") show((current + 1) % cases.length, true);
      if (e.key === "ArrowLeft") show((current - 1 + cases.length) % cases.length, true);
    });
  }
})();

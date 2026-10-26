/* ==========================================================
   첫 접속 인트로
   흰 화면에서 금빛 가는 줄이 화면 가로로 펼쳐졌다 모이고 → 금빛 선이 로고를 그려 내고 → 한 줄 문구가 단어마다 마스크 뒤에서 떠오름 → 화면이 위로 걷히며 페이지 등장.
   - 세션(창)마다 한 번만. 클릭·키·스크롤로 바로 건너뛸 수 있음.
   - 로딩 숫자/진행 막대는 쓰지 않습니다.
   - <head>의 인라인 스크립트가 <html>에 .is-intro를 붙여 첫 화면이 비치지 않게 가립니다.
   - 다시 보기: LP_INTRO.replay() (디자인 시스템 문서에서 사용)
   ========================================================== */
(function () {
  "use strict";
  const root = document.documentElement;
  const KEY = "lp_intro_seen";
  const WORD_START = 1300; // 첫 단어가 떠오르기 시작하는 때 (ms). 로고가 다 그려질 즈음
  const WORD_STEP = 95; // 단어 사이 간격 (ms)
  const WORD_DUR = 900; // 단어 하나가 떠오르는 시간 (ms, CSS와 같게)
  const HOLD = 650; // 문구가 다 나온 뒤 머무는 시간 (ms)
  const SKIP_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"];

  function run(waitForText) {
    const cfg = window.LP_CONFIG;
    root.classList.add("is-intro");

    const el = document.createElement("div");
    el.className = "intro";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="intro-inner">' +
      '<span class="intro-logo"><img src="' + cfg.logo.full + '" alt="" /></span>' +
      '<span class="intro-rule"></span>' +
      '<p class="intro-line"></p>' +
      "</div>";
    document.body.appendChild(el);
    const line = el.querySelector(".intro-line");

    let finished = false;
    const timers = [];

    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      try {
        sessionStorage.setItem(KEY, "1");
      } catch (e) {}
      el.classList.add("is-leaving");
      root.classList.remove("is-intro");
      document.dispatchEvent(new CustomEvent("lp:introdone"));
      setTimeout(function () {
        el.remove();
      }, 1100);
      SKIP_EVENTS.forEach(function (ev) {
        window.removeEventListener(ev, finish);
      });
    }

    function play() {
      const text = (window.LP_I18N && LP_I18N.t("intro.tagline")) || "";
      let count = 0;
      LP_I18N.words(text).forEach(function (part) {
        if (!part.isWord) {
          line.appendChild(document.createTextNode(part.text));
          return;
        }
        const w = document.createElement("span");
        w.className = "intro-word";
        const inner = document.createElement("span");
        inner.textContent = part.text;
        w.appendChild(inner);
        line.appendChild(w);
        const delay = WORD_START + count * WORD_STEP;
        count += 1;
        timers.push(
          setTimeout(function () {
            w.classList.add("is-lit");
          }, delay),
        );
      });
      // 로고가 그려질 시간을 한 프레임 준 뒤 시작
      requestAnimationFrame(function () {
        el.classList.add("is-playing");
      });
      timers.push(setTimeout(finish, WORD_START + count * WORD_STEP + WORD_DUR + HOLD));
      // 건너뛰기는 재생이 시작된 뒤부터 (다시 보기 버튼 클릭이 바로 건너뛰지 않도록)
      setTimeout(function () {
        SKIP_EVENTS.forEach(function (ev) {
          window.addEventListener(ev, finish, { passive: true });
        });
      }, 300);
    }

    if (!waitForText) {
      play();
      return;
    }
    // 번역 파일이 준비되면 시작 (최대 1.5초 기다린 뒤에는 문구 없이 진행)
    let started = false;
    function start() {
      if (started) return;
      started = true;
      play();
    }
    document.addEventListener("lp:langchange", start, { once: true });
    timers.push(setTimeout(start, 1500));
  }

  if (root.classList.contains("is-intro")) run(true);

  window.LP_INTRO = {
    replay: function () {
      run(false);
    },
  };
})();

/* 언어 안내 띠
   브라우저 언어가 한국어 · 일본어 · 영어 중 하나이고 지금 보는 페이지의 언어와 다를 때만, 화면 아래에 작은 안내를 한 번 보여 줍니다.
   - 자동으로 옮기지 않습니다(검색 로봇이 잘못 옮겨지지 않게). 단추를 누르면 같은 페이지의 그 언어 주소로 이동합니다.
   - 닫거나 언어 메뉴로 직접 고르면 이 브라우저에서는 다시 보이지 않습니다.
   - 글은 안내하는 언어(옮겨 갈 언어)로 적어 두었습니다. 지금 페이지의 번역 파일과 무관합니다. */
(function () {
  "use strict";
  const cfg = window.LP_CONFIG;
  const KEY = "lp-langbar-dismissed";
  const TEXT = {
    ko: { msg: "한국어 페이지가 있습니다", go: "한국어로 보기", close: "닫기" },
    ja: { msg: "日本語のページがあります", go: "日本語で見る", close: "閉じる" },
    en: { msg: "This page is also in English", go: "View in English", close: "Close" },
  };

  function read() {
    try {
      return window.localStorage.getItem(KEY) === "1";
    } catch (e) {
      return false;
    }
  }
  function remember() {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch (e) {
      /* 저장할 수 없는 환경(사생활 보호 모드 등)에서는 이번 방문에서만 닫힘 */
    }
  }

  // 브라우저 언어 목록에서 사이트가 지원하는 첫 언어
  function preferred() {
    const list = window.navigator.languages && window.navigator.languages.length ? window.navigator.languages : [window.navigator.language || ""];
    for (let i = 0; i < list.length; i++) {
      const l = String(list[i]).slice(0, 2).toLowerCase();
      if (cfg.supportedLangs.indexOf(l) !== -1) return l;
    }
    return null;
  }

  function show(lang) {
    const txt = TEXT[lang];
    const bar = document.createElement("div");
    bar.className = "langbar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", txt.msg);
    bar.setAttribute("lang", lang);

    const msg = document.createElement("p");
    msg.className = "langbar-msg";
    msg.textContent = txt.msg;

    const go = document.createElement("a");
    go.className = "langbar-go";
    go.href = window.LP_I18N.href(lang);
    go.setAttribute("hreflang", lang);
    go.textContent = txt.go;

    const close = document.createElement("button");
    close.className = "langbar-close";
    close.type = "button";
    close.setAttribute("aria-label", txt.close);
    close.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8" /></svg>';

    function dismiss() {
      remember();
      bar.classList.remove("is-shown");
      window.setTimeout(function () {
        bar.remove();
      }, 400);
    }
    close.addEventListener("click", dismiss);
    bar.addEventListener("keydown", function (e) {
      if (e.key === "Escape") dismiss();
    });

    bar.append(msg, go, close);
    document.body.appendChild(bar);
    // 다음 프레임에 보여 등장 전환이 나오게
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        bar.classList.add("is-shown");
      });
    });
  }

  function init() {
    if (read()) return;
    const pref = preferred();
    const current = (document.documentElement.lang || "").slice(0, 2);
    if (!pref || pref === current) return;
    // 첫 화면 연출(인트로)이 끝난 뒤에 보여 줌
    window.setTimeout(function () {
      show(pref);
    }, 3200);
  }

  // 언어 메뉴로 직접 고른 사람에게는 다시 묻지 않음
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-lang]")) remember();
  });

  init();
})();

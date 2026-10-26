/* 한국어·일본어·영어
   - 언어는 주소로 정해집니다: 한국어 /, 일본어 /ja/, 영어 /en/ (페이지 <html lang>). 글은 tools/build가 미리 채워 두고,
     여기서는 같은 번역 파일로 다시 채워 동적인 부분(견적 · 사례 · 환율 등)과 맞춥니다.
   - 언어 단추를 누르면 같은 페이지의 다른 언어 주소로 이동합니다.
   - data-list="키"       : 번역 파일의 배열을 안쪽 <template>으로 하나씩 그립니다.
       템플릿 안에서  data-k="필드"            글자 채움 (값이 없으면 요소를 지움, "."은 항목 자체)
                      data-k-attr="속성:필드"  속성 채움 (; 로 여러 개)
                      data-k-list="필드"       항목 안의 배열을 다시 안쪽 <template>으로 그림
       data-limit="3"        앞에서부터 몇 개만 그림
   - data-i18n="키"       : 요소의 글자를 번역 문구로 채웁니다.
                            문구 안의 줄바꿈(\n)은 줄 단위 <span class="line">이 됩니다.
   - data-i18n-attr="속성:키" : aria-label, content 같은 속성을 번역합니다. (; 로 여러 개) */
(function () {
  "use strict";
  const cfg = window.LP_CONFIG;
  const cache = {};
  let dict = {};
  let currentLang = cfg.defaultLang;

  // 지금 페이지의 언어 (<html lang>)
  function pageLang() {
    const l = (document.documentElement.lang || "").slice(0, 2);
    return cfg.supportedLangs.indexOf(l) !== -1 ? l : cfg.defaultLang;
  }

  // 같은 페이지의 다른 언어 주소 (끝의 파일 이름 · 검색어 · #를 그대로). 언어별 페이지가 아니면(디자인 시스템 등) 그 언어의 홈
  function pageHref(lang) {
    const file = location.pathname.split("/").pop() || "index.html";
    const up = cfg.langDirs[currentLang] ? "../" : "";
    if (cfg.pages.indexOf(file.replace(/\.html$/, "")) === -1) return up + cfg.langDirs[lang] + "index.html";
    return up + cfg.langDirs[lang] + file + location.search + location.hash;
  }

  function lookup(obj, key) {
    if (key === ".") return obj;
    return key.split(".").reduce(function (o, k) {
      return o && o[k] !== undefined ? o[k] : null;
    }, obj);
  }

  function t(key) {
    const value = lookup(dict, key);
    if (typeof value !== "string") {
      console.warn("[i18n] 번역 키를 찾을 수 없습니다:", key);
      return null;
    }
    return value.replace("{year}", String(new Date().getFullYear()));
  }

  // 줄마다 나타나는 제목(data-reveal="lines" · "focus")은 한 줄이어도 <span class="line"><span>으로 감싸고 줄 번호(--l)를 붙임
  function fill(node, text) {
    const masked = /^(lines|focus)$/.test(node.getAttribute("data-reveal") || "");
    if (text.indexOf("\n") === -1 && !masked) {
      node.textContent = text;
      return;
    }
    node.textContent = "";
    text.split("\n").forEach(function (part, i) {
      const line = document.createElement("span");
      line.className = "line";
      if (masked) {
        const inner = document.createElement("span");
        inner.textContent = part;
        line.style.setProperty("--l", String(i));
        line.appendChild(inner);
      } else {
        line.textContent = part;
      }
      node.appendChild(line);
    });
  }

  // 배열을 템플릿으로 그림. 바깥 항목의 글자를 먼저 채운 뒤 안쪽 목록을 그려서 서로 섞이지 않게 함
  function renderList(box, arr) {
    const tpl = box.querySelector(":scope > template");
    if (!tpl || !Array.isArray(arr)) return;
    // 전에 그린 항목만 지움 (템플릿 옆의 고정 요소는 그대로)
    Array.from(box.children).forEach(function (c) {
      if (c.hasAttribute("data-gen")) c.remove();
    });
    const limit = Number(box.dataset.limit) || arr.length;
    arr.slice(0, limit).forEach(function (item, i) {
      const frag = tpl.content.cloneNode(true);
      frag.querySelectorAll("[data-k]").forEach(function (n) {
        const v = lookup(item, n.dataset.k);
        if (v === null || v === undefined || v === "") n.remove();
        else fill(n, String(v));
      });
      frag.querySelectorAll("[data-k-attr]").forEach(function (n) {
        n.dataset.kAttr.split(";").forEach(function (pair) {
          const parts = pair.split(":");
          const v = lookup(item, (parts[1] || "").trim());
          if (v !== null && v !== undefined) n.setAttribute((parts[0] || "").trim(), String(v));
        });
      });
      frag.querySelectorAll("[data-k-list]").forEach(function (sub) {
        renderList(sub, lookup(item, sub.dataset.kList));
      });
      // 순서대로 나타나도록 차례 번호(--i)를 줌 (7번째부터는 같이)
      frag.querySelectorAll("[data-reveal]").forEach(function (n) {
        n.style.setProperty("--i", String(Math.min(i, 6)));
      });
      Array.from(frag.children).forEach(function (c) {
        c.setAttribute("data-gen", "");
      });
      box.appendChild(frag);
    });
  }

  function apply() {
    document.querySelectorAll("[data-list]").forEach(function (box) {
      renderList(box, lookup(dict, box.dataset.list));
    });
    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      const v = t(node.dataset.i18n);
      if (v === null) return;
      if (node.tagName === "TITLE") node.textContent = v.replace(/\n/g, " ");
      else fill(node, v);
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (node) {
      node.dataset.i18nAttr.split(";").forEach(function (pair) {
        const parts = pair.split(":");
        const attr = (parts[0] || "").trim();
        const key = (parts[1] || "").trim();
        if (!attr || !key) return;
        const v = t(key);
        if (v !== null) node.setAttribute(attr, v.replace(/\n/g, " "));
      });
    });
    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.dataset.lang === currentLang ? "true" : "false");
    });
  }

  async function load(lang) {
    if (cache[lang]) return cache[lang];
    const res = await fetch(cfg.root + "i18n/" + lang + ".json");
    if (!res.ok) throw new Error("번역 파일을 불러오지 못했습니다: " + lang);
    cache[lang] = await res.json();
    return cache[lang];
  }

  async function setLang(lang) {
    try {
      dict = await load(lang);
    } catch (err) {
      console.error(err, "\n※ 페이지를 더블클릭으로 열지 말고 Live Server로 열어 주세요.");
      return;
    }
    currentLang = lang;
    apply();
    document.dispatchEvent(new CustomEvent("lp:langchange", { detail: { lang: lang } }));
  }

  function init() {
    document.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-lang]");
      if (btn && btn.dataset.lang !== currentLang) location.assign(pageHref(btn.dataset.lang));
    });
    currentLang = pageLang();
    return setLang(currentLang);
  }

  // 문장을 '단어'로 나눔 (인트로·스크롤 단어 채움용).
  // 띄어쓰기가 있으면 띄어쓰기로, 일본어처럼 없으면 브라우저의 어절 분리 기능으로 나눕니다.
  // 반환값: [{ text, isWord }] — 공백·문장부호는 isWord=false로 그대로 이어 붙이면 원문이 됨
  function words(text) {
    if (/\s/.test(text.trim()) || !window.Intl || !Intl.Segmenter) {
      return text.split(/(\s+)/).filter(Boolean).map(function (part) {
        return { text: part, isWord: !/^\s+$/.test(part) };
      });
    }
    const seg = new Intl.Segmenter(currentLang, { granularity: "word" });
    const out = [];
    Array.from(seg.segment(text)).forEach(function (s) {
      // 문장부호(、。)는 앞 단어에 붙여 줄바꿈 시 홀로 떨어지지 않게
      if (!s.isWordLike && out.length && !/\s/.test(s.segment)) out[out.length - 1].text += s.segment;
      else out.push({ text: s.segment, isWord: s.isWordLike !== false && !/^\s+$/.test(s.segment) });
    });
    return out;
  }

  window.LP_I18N = {
    init: init,
    t: t,
    // 글자가 아닌 값(배열 · 묶음)도 그대로 꺼냄. 없으면 null
    get: function (key) {
      return lookup(dict, key);
    },
    words: words,
    lang: function () {
      return currentLang;
    },
  };
})();

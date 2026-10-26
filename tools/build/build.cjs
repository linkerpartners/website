/* 언어별 정적 페이지 만들기
   src/*.html(원본 8쪽) + i18n/*.json → 한국어(맨 위) · 일본어(ja/) · 영어(en/) 페이지,
   sitemap.xml, robots.txt.

   - 번역 문구(data-i18n · data-i18n-attr · data-list)를 글자로 미리 채워 둡니다(검색엔진 · 느린 회선에서도 보이게).
     채우는 규칙은 assets/js/i18n.js와 같고, 브라우저에서는 같은 번역 파일로 한 번 더 채워 동적인 부분과 맞춥니다.
   - 일본어 · 영어 페이지는 ../ 를 붙여 assets · data · i18n 을 맨 위에서 읽습니다.
   - <head>에 canonical · hreflang · Open Graph를 넣습니다. 주소는 site.json의 url.
   쓰는 법: tools/build 에서  npm install  (처음 한 번)  →  npm run build */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { parseHTML } = require("linkedom");

const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "src");
const SITE = JSON.parse(fs.readFileSync(path.join(__dirname, "site.json"), "utf8"));
const LANGS = ["ko", "ja", "en"];
const DIR = { ko: "", ja: "ja/", en: "en/" };
const LOCALE = { ko: "ko_KR", ja: "ja_JP", en: "en_US" };
const PAGES = ["index", "about", "services", "pricing", "cases", "insights", "contact", "privacy"];

const dicts = {};
LANGS.forEach(function (l) {
  dicts[l] = JSON.parse(fs.readFileSync(path.join(ROOT, "i18n", l + ".json"), "utf8"));
});

const problems = [];
const inlineHashes = new Set(); // 페이지 안의 인라인 스크립트(CSP에 해시로 허용)

// 보안 정책(CSP). 헤더를 못 쓰는 호스팅(GitHub Pages)을 위해 각 페이지 <head>에 meta로도 넣고(frame-ancestors는 meta에서 무시되므로 뺌),
// 헤더를 쓸 수 있으면 _headers로도 냄
function buildCsp(hashes, asMeta) {
  return [
    "default-src 'self'",
    "script-src 'self' " + Array.from(hashes).join(" "),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://api.frankfurter.dev",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]
    .concat(asMeta ? [] : ["frame-ancestors 'none'"])
    .join("; ");
}

function lookup(obj, key) {
  if (key === ".") return obj;
  return key.split(".").reduce(function (o, k) {
    return o && o[k] !== undefined ? o[k] : null;
  }, obj);
}

function url(lang, page) {
  return SITE.url.replace(/\/$/, "") + "/" + DIR[lang] + (page === "index" ? "" : page + ".html");
}

function render(page, lang) {
  const where = lang + "/" + page;
  const dict = dicts[lang];
  const { document } = parseHTML(fs.readFileSync(path.join(SRC, page + ".html"), "utf8"));
  const year = String(new Date().getFullYear());

  const t = function (key) {
    const v = lookup(dict, key);
    if (typeof v !== "string") {
      problems.push(where + ": 번역 키 없음 " + key);
      return null;
    }
    return v.replace("{year}", year);
  };

  // assets/js/i18n.js fill()과 같은 규칙
  function fill(node, text) {
    const masked = /^(lines|focus)$/.test(node.getAttribute("data-reveal") || "");
    if (text.indexOf("\n") === -1 && !masked) {
      node.textContent = text;
      return;
    }
    node.textContent = "";
    text.split("\n").forEach(function (part, i) {
      const line = document.createElement("span");
      line.setAttribute("class", "line");
      if (masked) {
        const inner = document.createElement("span");
        inner.textContent = part;
        line.setAttribute("style", "--l: " + i);
        line.appendChild(inner);
      } else {
        line.textContent = part;
      }
      node.appendChild(line);
    });
  }

  function renderList(box, arr, top) {
    const tpl = Array.from(box.children).filter(function (c) {
      return c.tagName === "TEMPLATE";
    })[0];
    if (!tpl || !Array.isArray(arr)) {
      if (top && !Array.isArray(arr)) problems.push(where + ": 목록 키 없음 " + box.getAttribute("data-list"));
      return;
    }
    Array.from(box.children).forEach(function (c) {
      if (c.hasAttribute("data-gen")) c.remove();
    });
    const limit = Number(box.getAttribute("data-limit")) || arr.length;
    arr.slice(0, limit).forEach(function (item, i) {
      const frag = tpl.content.cloneNode(true);
      frag.querySelectorAll("[data-k]").forEach(function (n) {
        const v = lookup(item, n.getAttribute("data-k"));
        if (v === null || v === undefined || v === "") n.remove();
        else fill(n, String(v));
      });
      frag.querySelectorAll("[data-k-attr]").forEach(function (n) {
        n.getAttribute("data-k-attr")
          .split(";")
          .forEach(function (pair) {
            const parts = pair.split(":");
            const v = lookup(item, (parts[1] || "").trim());
            if (v !== null && v !== undefined) n.setAttribute((parts[0] || "").trim(), String(v));
          });
      });
      frag.querySelectorAll("[data-k-list]").forEach(function (sub) {
        renderList(sub, lookup(item, sub.getAttribute("data-k-list")));
      });
      frag.querySelectorAll("[data-reveal]").forEach(function (n) {
        const prev = n.getAttribute("style") || "";
        n.setAttribute("style", (prev ? prev.replace(/;?\s*$/, "; ") : "") + "--i: " + Math.min(i, 6));
      });
      Array.from(frag.children).forEach(function (c) {
        c.setAttribute("data-gen", "");
      });
      box.appendChild(frag);
    });
  }

  // 바깥 목록부터(안쪽 목록은 renderList 안에서)
  document.querySelectorAll("[data-list]").forEach(function (box) {
    if (box.closest("template")) return;
    renderList(box, lookup(dict, box.getAttribute("data-list")), true);
  });
  document.querySelectorAll("[data-i18n]").forEach(function (node) {
    if (node.closest("template")) return;
    const v = t(node.getAttribute("data-i18n"));
    if (v === null) return;
    if (node.tagName === "TITLE") node.textContent = v.replace(/\n/g, " ");
    else fill(node, v);
  });
  document.querySelectorAll("[data-i18n-attr]").forEach(function (node) {
    if (node.closest("template")) return;
    node.getAttribute("data-i18n-attr")
      .split(";")
      .forEach(function (pair) {
        const parts = pair.split(":");
        const attr = (parts[0] || "").trim();
        const key = (parts[1] || "").trim();
        if (!attr || !key) return;
        const v = t(key);
        if (v !== null) node.setAttribute(attr, v.replace(/\n/g, " "));
      });
  });

  document.documentElement.setAttribute("lang", lang);

  // 폴더 한 단계 아래 페이지: assets · data · i18n 은 맨 위에서
  if (DIR[lang]) {
    document.querySelectorAll("[src], [href]").forEach(function (n) {
      ["src", "href"].forEach(function (a) {
        const v = n.getAttribute(a);
        if (v && /^(assets|data|i18n)\//.test(v)) n.setAttribute(a, "../" + v);
      });
    });
  }

  // 검색 · 공유용 head
  const head = document.querySelector("head");
  const add = function (tag, attrs) {
    const n = document.createElement(tag);
    Object.keys(attrs).forEach(function (k) {
      n.setAttribute(k, attrs[k]);
    });
    head.appendChild(n);
    return n;
  };
  const title = document.querySelector("title").textContent;
  const descNode = document.querySelector('meta[name="description"]');
  const desc = descNode ? descNode.getAttribute("content") : "";
  add("link", { rel: "canonical", href: url(lang, page) });
  LANGS.forEach(function (l) {
    add("link", { rel: "alternate", hreflang: l, href: url(l, page) });
  });
  add("link", { rel: "alternate", hreflang: "x-default", href: url("ko", page) });
  add("meta", { property: "og:type", content: "website" });
  add("meta", { property: "og:site_name", content: SITE.name });
  add("meta", { property: "og:title", content: title });
  if (desc) add("meta", { property: "og:description", content: desc });
  add("meta", { property: "og:url", content: url(lang, page) });
  add("meta", { property: "og:locale", content: LOCALE[lang] });
  LANGS.filter(function (l) {
    return l !== lang;
  }).forEach(function (l) {
    add("meta", { property: "og:locale:alternate", content: LOCALE[l] });
  });
  if (SITE.ogImage) add("meta", { property: "og:image", content: SITE.url.replace(/\/$/, "") + "/" + SITE.ogImage });
  add("meta", { name: "twitter:card", content: SITE.ogImage ? "summary_large_image" : "summary" });
  // 검색엔진 사이트 소유 확인(site.json에 값이 있을 때만): 구글 서치 콘솔 · 네이버 서치어드바이저의 'HTML 태그' 방식
  if (SITE.googleSiteVerification) add("meta", { name: "google-site-verification", content: SITE.googleSiteVerification });
  if (SITE.naverSiteVerification) add("meta", { name: "naver-site-verification", content: SITE.naverSiteVerification });
  if (page === "index") {
    const ld = add("script", { type: "application/ld+json" });
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE.name,
      url: url(lang, "index"),
      logo: SITE.url.replace(/\/$/, "") + "/assets/logo/linker-logo.svg",
      description: desc,
      email: SITE.email,
      areaServed: ["KR", "JP"],
      knowsLanguage: ["ko", "ja", "en"],
    });
  }

  const pageHashes = new Set();
  document.querySelectorAll("script:not([src])").forEach(function (n) {
    const type = n.getAttribute("type");
    if (type && type !== "text/javascript" && type !== "module") return; // JSON-LD 등은 실행되지 않음
    const h = "'sha256-" + crypto.createHash("sha256").update(n.textContent, "utf8").digest("base64") + "'";
    pageHashes.add(h);
    inlineHashes.add(h);
  });
  {
    const m = document.createElement("meta");
    m.setAttribute("http-equiv", "Content-Security-Policy");
    m.setAttribute("content", buildCsp(pageHashes, true));
    const charset = head.querySelector("meta[charset]");
    if (charset) charset.after(m);
    else head.prepend(m);
  }

  const out = document.toString().replace(/^<!DOCTYPE html>/i, "<!doctype html>\n<!-- 자동 생성 파일: src/" + page + ".html 을 고친 뒤 tools/build 에서 npm run build -->");
  const file = path.join(ROOT, DIR[lang], page + ".html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out);
}

PAGES.forEach(function (page) {
  LANGS.forEach(function (lang) {
    render(page, lang);
  });
});

// sitemap.xml (언어별 주소를 서로 연결) · robots.txt
const urls = [];
PAGES.forEach(function (page) {
  LANGS.forEach(function (lang) {
    const alts = LANGS.map(function (l) {
      return '    <xhtml:link rel="alternate" hreflang="' + l + '" href="' + url(l, page) + '" />';
    }).concat('    <xhtml:link rel="alternate" hreflang="x-default" href="' + url("ko", page) + '" />');
    urls.push("  <url>\n    <loc>" + url(lang, page) + "</loc>\n" + alts.join("\n") + "\n  </url>");
  });
});
fs.writeFileSync(
  path.join(ROOT, "sitemap.xml"),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + urls.join("\n") + "\n</urlset>\n",
);
fs.writeFileSync(path.join(ROOT, "robots.txt"), "User-agent: *\nAllow: /\nDisallow: /design-system.html\n\nSitemap: " + SITE.url.replace(/\/$/, "") + "/sitemap.xml\n");

// _headers: 보안 · 캐시 헤더 (Netlify · Cloudflare Pages 형식. 다른 호스팅이면 같은 값을 그곳 설정에 옮김. docs/배포-가이드.md)
const csp = buildCsp(inlineHashes, false);
fs.writeFileSync(
  path.join(ROOT, "_headers"),
  [
    "# 자동 생성(tools/build). 보안 · 캐시 헤더",
    "/*",
    "  X-Content-Type-Options: nosniff",
    "  X-Frame-Options: DENY",
    "  Referrer-Policy: strict-origin-when-cross-origin",
    "  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()",
    "  Content-Security-Policy: " + csp,
    "  Cache-Control: public, max-age=0, must-revalidate",
    "",
    "/assets/fonts/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "",
    "/assets/logo/*",
    "  Cache-Control: public, max-age=2592000",
    "",
    "/assets/css/*",
    "  Cache-Control: public, max-age=3600",
    "",
    "/assets/js/*",
    "  Cache-Control: public, max-age=3600",
    "",
    "/i18n/*",
    "  Cache-Control: public, max-age=3600",
    "",
    "/data/*",
    "  Cache-Control: public, max-age=3600",
    "",
  ].join("\n"),
);

const uniq = Array.from(new Set(problems));
console.log("만든 페이지: " + PAGES.length * LANGS.length + "개 · sitemap.xml · robots.txt · _headers(인라인 스크립트 해시 " + inlineHashes.size + "개)");
if (uniq.length) {
  console.log("확인할 것 " + uniq.length + "건:\n  " + uniq.join("\n  "));
  process.exitCode = 1;
}

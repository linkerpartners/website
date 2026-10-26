/* 글꼴 자체 호스팅: 외부(jsDelivr · Google Fonts)에서 받던 글꼴 세 가지를 assets/fonts/에 내려받고
   assets/css/fonts.css를 만듭니다. 글꼴 버전을 바꾸거나 처음 세팅할 때만 한 번 실행하세요(결과 파일은 사이트에 포함).
   - 한국어 Pretendard Variable (dynamic subset, 필요한 글자 조각만 불러옴)
   - 일본어 Noto Serif JP (가변 200–700, 글자 조각)
   - 영어 · 숫자 Newsreader (opsz 72, 200)
   쓰는 법: node fonts.cjs */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "assets/fonts");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const SOURCES = [
  {
    dir: "pretendard",
    css: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css",
    label: "한국어 · Pretendard Variable",
  },
  {
    dir: "noto-serif-jp",
    css: "https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@200..700&display=swap",
    label: "일본어 · Noto Serif JP",
  },
  {
    dir: "newsreader",
    css: "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@72,200&display=swap",
    label: "영어 · 숫자 · Newsreader",
  },
];

async function get(url, text) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(res.status + " " + url);
  return text ? res.text() : Buffer.from(await res.arrayBuffer());
}

async function pool(items, size, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async function () {
      while (i < items.length) {
        const k = i++;
        await fn(items[k], k);
      }
    }),
  );
}

(async function () {
  let css = "/* 자체 호스팅 글꼴 (tools/build/fonts.cjs가 만듦. 직접 고치지 마세요)\n   한국어 Pretendard Variable · 일본어 Noto Serif JP · 영어 · 숫자 Newsreader (SIL Open Font License) */\n";
  let bytes = 0;
  let files = 0;
  for (const src of SOURCES) {
    const dir = path.join(OUT, src.dir);
    fs.mkdirSync(dir, { recursive: true });
    const text = (await get(src.css, true)).replace(/\/\*[\s\S]*?\*\//g, "");
    const urls = [];
    const map = new Map();
    text.replace(/url\(([^)]+)\)/g, function (m, raw) {
      const u = raw.replace(/['"]/g, "");
      const abs = new URL(u, src.css).href;
      if (!map.has(abs)) {
        map.set(abs, src.dir + "-" + String(map.size).padStart(3, "0") + ".woff2");
        urls.push(abs);
      }
      return m;
    });
    await pool(urls, 8, async function (abs) {
      const buf = await get(abs);
      fs.writeFileSync(path.join(dir, map.get(abs)), buf);
      bytes += buf.length;
      files++;
    });
    const rewritten = text.replace(/url\(([^)]+)\)/g, function (m, raw) {
      const abs = new URL(raw.replace(/['"]/g, ""), src.css).href;
      return "url(../fonts/" + src.dir + "/" + map.get(abs) + ")";
    });
    css += "\n/* " + src.label + " */\n" + rewritten.trim() + "\n";
    console.log(src.label + ": " + urls.length + "개 파일");
  }
  fs.writeFileSync(path.join(ROOT, "assets/css/fonts.css"), css);
  console.log("총 " + files + "개 · " + (bytes / 1048576).toFixed(1) + "MB → assets/fonts · assets/css/fonts.css");
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});

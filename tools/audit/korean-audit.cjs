/* 한국어 전수조사: 사이트에 보이는 한글을 한 곳도 빠짐없이 뽑아 검수용 표로 만듭니다.
   실행(저장소 맨 위에서):  node tools/audit/korean-audit.cjs
   결과: docs/내부/문구-검수/한국어-전수조사/ (git에 올라가지 않는 폴더)
     1) 01-한국어-전체-문구.csv   i18n/ko.json 의 모든 문장 (키 · 글자 수 · 문장). 한국어 검수의 본 자료
     2) 02-사례-한국어-문구.csv   data/cases 폴더의 사례별 case.json 에 있는 한국어 문장
     3) 03-코드에-직접-쓴-한글.csv  번역 파일 밖(HTML · JS · CSS · 설정)에 직접 적힌 한글. 주석은 따로 표시
     4) 04-일본어-영어-페이지에-섞인-한글.csv  /ja/ /en/ 페이지, ja.json · en.json, 사례 ja/en 칸에 남은 한글
     5) 05-점검-표시.csv        설정한 패턴(부정 표현 · 호칭 · AI 투 단어 등)에 걸린 문장
     6) 요약.md                  위 결과의 개수와 읽는 법
   파일은 UTF-8(BOM)이라 엑셀에서 바로 열립니다. 이 스크립트는 사이트 파일을 수정하지 않습니다. */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "docs", "내부", "문구-검수", "한국어-전수조사");
const HANGUL = /[ㄱ-ㆎ가-힣]/;
const HANGUL_G = /[ㄱ-ㆎ가-힣]+/g;

/* ---------- 설정(여기만 고치면 됩니다) ---------- */
// 일본어 · 영어 페이지에 한글이 있어도 정상인 문구 (언어 이름 등)
const ALLOWED_IN_OTHER_LANGS = ["한국어", "한국어로 보기", "한국어 보기", "한국어로", "KO", "링커파트너스"];
// 점검 패턴: [이름, 정규식, 설명]
const PATTERNS = [
  ["부정 표현", /안 ?됩니다|안 ?된다|불가능|할 수 없|못 ?합니다|않습니다|없습니다|거절|금지|책임지지/, "긍정 문장으로 바꿀 수 있는지 (법적 문구는 예외)"],
  ["호칭", /작은 브랜드|소상공인|영세/, "'처음 나서는 브랜드'로 통일"],
  ["AI 투 단어", /혁신|최적의|최적화|원스톱|시너지|차별화된|극대화|압도적|획기적|탁월|독보적|완벽한|프리미엄|솔루션|노하우|토탈/, "과장 · 추상 표현"],
  ["번역투", /에 대해서?|를 통해|을 통해|함으로써|에 있어서|것으로 보입니다|라고 할 수 있/, "자연스러운 말로"],
  ["피동 · 사동 남용", /되어집니다|되어지|보여집니다|지원됩니다|제공됩니다/, "능동으로"],
  ["영문 표기", /[A-Za-z]{3,}/, "영어가 섞인 문장 (고유명사면 정상)"],
  ["줄바꿈 표시(\\n)", /\n/, "제목 줄바꿈 위치 확인"],
  ["긴 문장", { test: (s) => s.length >= 120 }, "120자 이상: 나눌 수 있는지"],
  ["느낌표 · 물음표 · 말줄임", /[!?…]|\.\.\./, "톤 확인"],
  ["사이트 안 숫자 · 금액", /\d[\d,]*\s*(원|만 ?원|엔|%|주|일|시간|분)/, "금액 · 기간이 요금 설정(config.js)과 일치하는지"],
];

/* ---------- 도구 ---------- */
const read = (p) => fs.readFileSync(p, "utf8");
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");
const clean = (s) => String(s).replace(/[ ⁠​]/g, (m) => (m === " " ? " " : ""));
const q = (s) => '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"';
const csv = (head, rows) => "﻿" + [head, ...rows].map((r) => r.map(q).join(",")).join("\n") + "\n";

function walkJson(o, p, fn) {
  if (typeof o === "string") fn(p, o);
  else if (Array.isArray(o)) o.forEach((v, i) => walkJson(v, p ? p + "." + i : String(i), fn));
  else if (o && typeof o === "object") for (const k in o) walkJson(o[k], p ? p + "." + k : k, fn);
}

function listFiles(dir, exts, skip) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, n.name);
    if (skip && skip(full, n)) continue;
    if (n.isDirectory()) out.push(...listFiles(full, exts, skip));
    else if (exts.includes(path.extname(n.name).toLowerCase())) out.push(full);
  }
  return out;
}

// 주석을 지운 줄과 주석 여부를 돌려줌 (HTML <!-- -->, CSS/JS /* */ 와 // 줄 주석)
function splitComments(text, ext) {
  const lines = text.split("\n");
  const res = [];
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // HTML 안 인라인 스크립트의 // 줄 주석
    if (ext === ".html" && /^\s*\/\/(?!\/)/.test(line)) {
      res.push({ no: i + 1, code: "", note: line });
      continue;
    }
    let code = "";
    let note = "";
    let rest = line;
    const openTok = ext === ".html" ? "<!--" : "/*";
    const closeTok = ext === ".html" ? "-->" : "*/";
    while (rest.length) {
      if (inBlock) {
        const e = rest.indexOf(closeTok);
        if (e < 0) { note += rest; rest = ""; }
        else { note += rest.slice(0, e); rest = rest.slice(e + closeTok.length); inBlock = false; }
      } else {
        const s = rest.indexOf(openTok);
        const sl = ext === ".js" || ext === ".cjs" ? rest.search(/(^|\s)\/\/(?!\/)/) : -1;
        if (sl >= 0 && (s < 0 || sl < s)) { code += rest.slice(0, sl); note += rest.slice(sl); rest = ""; }
        else if (s < 0) { code += rest; rest = ""; }
        else { code += rest.slice(0, s); rest = rest.slice(s + openTok.length); inBlock = true; }
      }
    }
    res.push({ no: i + 1, code, note });
  }
  return res;
}

// 화면에 안 보이는 개발자용 메시지(콘솔 · 빌드 오류 · 글꼴 도구 로그)
const DEV_MSG = /console\.(warn|error|log)|throw new Error|problems\.push|^\s*["']#|label:\s*["']|note:\s*["']/;
const results = { all: [], cases: [], hard: [], leak: [], flags: [] };

/* ---------- 1) ko.json 전체 문구 ---------- */
const koFlat = [];
walkJson(JSON.parse(read(path.join(ROOT, "i18n", "ko.json"))), "", (k, v) => koFlat.push([k, v]));
for (const [k, v] of koFlat) results.all.push([k, clean(v).length, clean(v).replace(/\n/g, " ⏎ ")]);

/* ---------- 2) 사례 한국어 ---------- */
const caseDirs = fs.existsSync(path.join(ROOT, "data", "cases"))
  ? fs.readdirSync(path.join(ROOT, "data", "cases"), { withFileTypes: true }).filter((d) => d.isDirectory())
  : [];
for (const d of caseDirs) {
  const f = path.join(ROOT, "data", "cases", d.name, "case.json");
  if (!fs.existsSync(f)) continue;
  const j = JSON.parse(read(f));
  const isTemplate = d.name.startsWith("_");
  walkJson(j, "", (k, v) => {
    const inKo = /(^|\.)ko(\.|$)/.test(k);
    const inOther = /(^|\.)(ja|en)(\.|$)/.test(k);
    if (inKo) results.cases.push([d.name + (isTemplate ? " (템플릿)" : ""), k, clean(v).length, clean(v)]);
    if (HANGUL.test(v)) {
      if (inOther) results.leak.push(["사례 " + d.name, k, "", clean(v)]);
      else if (!inKo) results.hard.push([rel(f), k, "사례 공통 칸(언어 구분 없음)", clean(v)]);
    }
  });
}

/* ---------- 3) 코드에 직접 쓴 한글 ---------- */
const skipCode = (full, ent) => /node_modules|\.git$|\.playwright|assets[\\/]fonts|assets[\\/]logo/.test(full);
const codeFiles = [
  ...listFiles(path.join(ROOT, "src"), [".html"], skipCode),
  ...listFiles(path.join(ROOT, "assets", "js"), [".js"], skipCode),
  ...listFiles(path.join(ROOT, "assets", "css"), [".css"], skipCode),
  ...listFiles(path.join(ROOT, "tools"), [".cjs", ".json", ".html"], (f, e) => skipCode(f, e) || /korean-audit|package-lock|node_modules/.test(f)),
  path.join(ROOT, "404.html"),
  path.join(ROOT, "robots.txt"),
  path.join(ROOT, "_headers"),
].filter((f) => fs.existsSync(f));
for (const f of codeFiles) {
  const ext = path.extname(f).toLowerCase();
  const text = read(f);
  if (ext === ".json" || !/\.(html|js|css|cjs)$/.test(ext)) {
    text.split("\n").forEach((ln, i) => HANGUL.test(ln) && results.hard.push([rel(f), i + 1, "값", ln.trim().slice(0, 200)]));
    continue;
  }
  for (const { no, code, note } of splitComments(text, ext)) {
    if (HANGUL.test(code)) results.hard.push([rel(f), no, DEV_MSG.test(code) ? "개발자 메시지(화면에 안 보임)" : "화면 · 코드", code.trim().slice(0, 200)]);
    else if (HANGUL.test(note)) results.hard.push([rel(f), no, "주석(화면에 안 보임)", note.trim().slice(0, 200)]);
  }
}
// 설정 파일(config.js)의 주석이 아닌 한글은 위에서 잡힘

/* ---------- 4) 일본어 · 영어에 섞인 한글 ---------- */
const allowed = (s) => {
  let t = s;
  for (const a of ALLOWED_IN_OTHER_LANGS) t = t.split(a).join("");
  return !HANGUL.test(t);
};
for (const l of ["ja", "en"]) {
  walkJson(JSON.parse(read(path.join(ROOT, "i18n", l + ".json"))), "", (k, v) => {
    if (HANGUL.test(v)) results.leak.push([l + ".json", k, allowed(v) ? "허용 목록" : "확인 필요", clean(v).slice(0, 200)]);
  });
  const dir = path.join(ROOT, l);
  for (const f of listFiles(dir, [".html"])) {
    const text = read(f).replace(/<!--[\s\S]*?-->/g, "");
    text.split("\n").forEach((ln, i) => {
      if (!HANGUL.test(ln) || /^\s*\/\/(?!\/)/.test(ln)) return; // 스크립트 주석 줄은 화면에 안 보임
      const hits = ln.match(HANGUL_G) || [];
      results.leak.push([rel(f), i + 1, allowed(ln.replace(/<[^>]+>/g, " ")) ? "허용 목록" : "확인 필요", hits.slice(0, 6).join(" ")]);
    });
  }
}

/* ---------- 5) 점검 표시 ---------- */
for (const [k, v] of koFlat) {
  const s = clean(v);
  for (const [name, re, why] of PATTERNS) {
    const hit = typeof re.test === "function" && !(re instanceof RegExp) ? re.test(s) : re.test(v);
    if (hit) results.flags.push([name, k, s.replace(/\n/g, " ⏎ ").slice(0, 260), why]);
  }
}

/* ---------- 저장 ---------- */
fs.mkdirSync(OUT, { recursive: true });
const write = (name, head, rows) => fs.writeFileSync(path.join(OUT, name), csv(head, rows));
write("01-한국어-전체-문구.csv", ["키", "글자 수", "문장"], results.all);
write("02-사례-한국어-문구.csv", ["사례", "키", "글자 수", "문장"], results.cases);
write("03-코드에-직접-쓴-한글.csv", ["파일", "줄/키", "종류", "내용"], results.hard);
write("04-일본어-영어-페이지에-섞인-한글.csv", ["위치", "줄/키", "판정", "내용"], results.leak);
write("05-점검-표시.csv", ["점검", "키", "문장", "확인할 것"], results.flags);

const count = (rows, i, v) => rows.filter((r) => r[i] === v).length;
const byPattern = {};
for (const r of results.flags) byPattern[r[0]] = (byPattern[r[0]] || 0) + 1;
const summary = [
  "# 한국어 전수조사 요약",
  "",
  "- 실행: `node tools/audit/korean-audit.cjs`  (" + new Date().toISOString().slice(0, 16).replace("T", " ") + ")",
  "- 이 스크립트는 사이트 파일을 바꾸지 않고, 이 폴더에 표만 만듭니다.",
  "",
  "| 파일 | 개수 | 읽는 법 |",
  "|---|---|---|",
  `| 01-한국어-전체-문구.csv | ${results.all.length} | 화면에 나오는 한국어 문장 전부. 검수의 본 자료 |`,
  `| 02-사례-한국어-문구.csv | ${results.cases.length} | 사례 데이터(data/cases)의 한국어 문장 |`,
  `| 03-코드에-직접-쓴-한글.csv | ${results.hard.length} (화면·코드 ${count(results.hard, 2, "화면 · 코드")}, 개발자 메시지 ${count(results.hard, 2, "개발자 메시지(화면에 안 보임)")}, 값 ${count(results.hard, 2, "값")}, 주석 ${count(results.hard, 2, "주석(화면에 안 보임)")}) | 번역 파일 밖에 적힌 한글. '화면 · 코드'가 번역 파일로 옮겨야 할 후보 |`,
  `| 04-일본어-영어-페이지에-섞인-한글.csv | ${results.leak.length} (확인 필요 ${count(results.leak, 2, "확인 필요")}, 허용 ${count(results.leak, 2, "허용 목록")}) | 일본어 · 영어 화면에 한글이 남은 곳. '확인 필요'만 보면 됩니다 |`,
  `| 05-점검-표시.csv | ${results.flags.length} | 아래 패턴에 걸린 문장 (정상일 수도 있음) |`,
  "",
  "## 점검 패턴별 개수",
  "",
  ...PATTERNS.map(([n, , why]) => `- ${n}: ${byPattern[n] || 0}건 — ${why}`),
  "",
  "## 권장 순서",
  "1. 04번에서 '확인 필요'가 0인지 확인합니다. (일본어 · 영어 화면에 한글이 있으면 안 됩니다)",
  "2. 03번에서 종류가 '화면 · 코드'인 줄을 번역 파일로 옮길지 정합니다.",
  "3. 01번(전체 문구)을 페이지 순서대로 읽으며 05번 표시와 함께 고칩니다.",
  "4. 고친 뒤 `cd tools/build && npm run build`, 다시 이 스크립트를 실행해 개수가 줄었는지 확인합니다.",
  "",
].join("\n");
fs.writeFileSync(path.join(OUT, "요약.md"), summary);
console.log(summary);
console.log("저장 위치:", rel(OUT));

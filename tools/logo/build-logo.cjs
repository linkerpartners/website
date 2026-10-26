/* LINKER 로고 생성기 — 로고 규정의 숫자를 그대로 계산해 아웃라인 SVG를 만든다.
   사용: (처음 한 번) npm i opentype.js@1.3.4 → node tools/logo/build-logo.cjs assets/logo */
const path = require("path");
const fs = require("fs");
const opentype = require("opentype.js");

const OUT = process.argv[2];
const light = opentype.loadSync(path.join(__dirname, "fonts/jost-300.woff")); // Jost Light 300
const regular = opentype.loadSync(path.join(__dirname, "fonts/jost-400.woff")); // Jost Regular 400

// ---- 규정 값 ----
const LINKER_TRACKING = 0.22; // em (2026-10-21 0.32 → 0.22로 좁힘)
const PARTNERS_RATIO = 0.23; // LINKER 크기 대비
const GAP = 0.34; // LINKER 기준선 → PARTNERS 대문자 윗선, LINKER 크기 대비
const MIN_PARTNERS_PX = 8;

const COLORS = {
  light: { linker: "#A8874E", partners: "#8E8A82" },
  dark: { linker: "#B8975E", partners: "#9C988F" },
  ink: { linker: "#2A2722", partners: "#2A2722" },
  white: { linker: "#FFFFFF", partners: "#FFFFFF" },
};

const r = (n) => Math.round(n * 1000) / 1000;

// 커닝 없이 글자마다 직접 배치 (font-kerning: none)
function place(font, text, size, tracking, startX, baseline) {
  const s = size / font.unitsPerEm;
  let x = startX;
  return text.split("").map((ch) => {
    const g = font.charToGlyph(ch);
    const bb = g.getBoundingBox();
    const item = {
      ch,
      glyph: g,
      x,
      inkLeft: x + bb.x1 * s,
      inkRight: x + bb.x2 * s,
      inkTop: baseline - bb.y2 * s,
      inkBottom: baseline - bb.y1 * s,
      d: g.getPath(x, baseline, size).toPathData(3),
    };
    x += g.advanceWidth * s + tracking;
    return item;
  });
}

function capHeight(font) {
  const os2 = font.tables.os2;
  if (os2 && os2.sCapHeight) return os2.sCapHeight;
  return font.charToGlyph("H").getBoundingBox().y2;
}

function inkBox(items) {
  return {
    left: Math.min(...items.map((i) => i.inkLeft)),
    right: Math.max(...items.map((i) => i.inkRight)),
    top: Math.min(...items.map((i) => i.inkTop)),
    bottom: Math.max(...items.map((i) => i.inkBottom)),
  };
}

/* F: LINKER 글자 크기(px). partners: 두 줄 여부. ratio: 지정하지 않으면 max(23%, 8px/F) */
function build(F, { partners = true, ratio } = {}) {
  const linker = place(light, "LINKER", F, LINKER_TRACKING * F, 0, 0);
  const L = inkBox(linker);
  // 첫 글자 L의 잉크 왼쪽 끝을 x=0으로
  const shift = -L.left;
  linker.forEach((i) => {
    i.x += shift;
    i.inkLeft += shift;
    i.inkRight += shift;
  });
  const linkerItems = place(light, "LINKER", F, LINKER_TRACKING * F, shift, 0);
  const LB = inkBox(linkerItems);

  const result = { F, linker: linkerItems, box: { ...LB } };
  if (!partners) return result;

  const k = ratio != null ? ratio : Math.max(PARTNERS_RATIO, MIN_PARTNERS_PX / F);
  const p = F * k;
  const s = p / regular.unitsPerEm;
  const text = "PARTNERS";
  const glyphs = text.split("").map((c) => regular.charToGlyph(c));
  const first = glyphs[0].getBoundingBox();
  const last = glyphs[glyphs.length - 1].getBoundingBox();
  const advBeforeLast = glyphs.slice(0, -1).reduce((a, g) => a + g.advanceWidth * s, 0);

  // 양 끝 맞춤: P 잉크 왼쪽 = L 잉크 왼쪽, S 잉크 오른쪽 = R 잉크 오른쪽
  const startX = LB.left - first.x1 * s;
  const tracking = (LB.right - last.x2 * s - startX - advBeforeLast) / (glyphs.length - 1);

  // 간격: LINKER 기준선(0) → PARTNERS 대문자 윗선 = GAP·F
  const capTop = GAP * F;
  const pBaseline = capTop + capHeight(regular) * s;

  const partnersItems = place(regular, text, p, tracking, startX, pBaseline);
  const PB = inkBox(partnersItems);

  result.partners = partnersItems;
  result.ratio = k;
  result.partnersSize = p;
  result.partnersTrackingEm = tracking / p;
  result.box = {
    left: Math.min(LB.left, PB.left),
    right: Math.max(LB.right, PB.right),
    top: Math.min(LB.top, PB.top),
    bottom: Math.max(LB.bottom, PB.bottom),
  };
  result.check = {
    leftDiff: PB.left - LB.left,
    rightDiff: PB.right - LB.right,
    capTopFromBaseline: pBaseline - capHeight(regular) * s,
  };
  return result;
}

function svg(res, colors, { title = "LINKERPARTNERS", pad = 0, sizeAttrs = true, square = false } = {}) {
  const b = res.box;
  let x = b.left - pad;
  let y = b.top - pad;
  let w = b.right - b.left + pad * 2;
  let h = b.bottom - b.top + pad * 2;
  if (square) {
    const side = Math.max(w, h);
    x -= (side - w) / 2;
    y -= (side - h) / 2;
    w = h = side;
  }
  const lPath = res.linker.map((i) => i.d).join("");
  const pPath = res.partners ? res.partners.map((i) => i.d).join("") : "";
  const size = sizeAttrs ? ` width="${r(w)}" height="${r(h)}"` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r(x)} ${r(y)} ${r(w)} ${r(h)}"${size} role="img" aria-label="${title}">` +
    `<title>${title}</title>` +
    `<path fill="${colors.linker}" d="${lPath}"/>` +
    (pPath ? `<path fill="${colors.partners}" d="${pPath}"/>` : "") +
    `</svg>\n`
  );
}

fs.mkdirSync(OUT, { recursive: true });
const write = (name, content) => fs.writeFileSync(path.join(OUT, name), content);

const report = [];
function log(name, res) {
  report.push({
    file: name,
    F: res.F,
    ratio: res.ratio && r(res.ratio),
    partnersPx: res.partnersSize && r(res.partnersSize),
    partnersTrackingEm: res.partnersTrackingEm && r(res.partnersTrackingEm),
    leftDiff: res.check && r(res.check.leftDiff),
    rightDiff: res.check && r(res.check.rightDiff),
    capTopGap: res.check && r(res.check.capTopFromBaseline / res.F),
    width: r(res.box.right - res.box.left),
    height: r(res.box.bottom - res.box.top),
  });
}

// 기준 크기 100 (큰 사용: 23% 고정)
const master = build(100, { ratio: PARTNERS_RATIO });
const mark = build(100, { partners: false });
log("master(100)", master);

write("linker-logo.svg", svg(master, COLORS.light, { sizeAttrs: false }));
write("linker-logo-dark.svg", svg(master, COLORS.dark, { sizeAttrs: false }));
write("linker-logo-mono-ink.svg", svg(master, COLORS.ink, { sizeAttrs: false }));
write("linker-logo-mono-white.svg", svg(master, COLORS.white, { sizeAttrs: false }));
write("linker-wordmark.svg", svg(mark, COLORS.light, { sizeAttrs: false }));
write("linker-wordmark-dark.svg", svg(mark, COLORS.dark, { sizeAttrs: false }));
write("linker-wordmark-mono-ink.svg", svg(mark, COLORS.ink, { sizeAttrs: false }));
write("linker-wordmark-mono-white.svg", svg(mark, COLORS.white, { sizeAttrs: false }));

// 헤더용 (작은 사용: PARTNERS 8px 이상 보장)
const headerMobile = build(19); // 모바일 헤더 LINKER 19px
const headerPc = build(22); // PC 헤더 LINKER 22px
log("header-mobile(19)", headerMobile);
log("header-pc(22)", headerPc);
write("linker-logo-header-mobile.svg", svg(headerMobile, COLORS.light));
write("linker-logo-header-pc.svg", svg(headerPc, COLORS.light));

// 파비콘: LINKER 한 줄 (18px 미만 규칙)
// 파비콘은 작은 크기에서 읽히도록 가운데 'L' 모노그램(금빛 바탕 · 흰 L, 가운데 56%에 둠. 구글은 원형으로 잘라 보임)
write("favicon.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="LINKERPARTNERS"><title>LINKERPARTNERS</title><rect width="100" height="100" fill="#A8874E"/><path fill="#FFFFFF" d="M35 22H43V70H65V78H35Z"/></svg>\n');
// PNG(favicon-48/96/192 · apple-touch-icon · icon-512)와 favicon.ico는 이 SVG를 브라우저로 그려 만듦(docs/배포-가이드.md)

// 문서용 수치
const capL = capHeight(light) * (100 / light.unitsPerEm);
write(
  "logo-metrics.json",
  JSON.stringify(
    {
      note: "build-logo.cjs가 계산한 값. 단위: LINKER 글자 크기 100 기준",
      linkerCapHeight: r(capL),
      clearSpace: r(capL * 0.5),
      master: {
        width: r(master.box.right - master.box.left),
        height: r(master.box.bottom - master.box.top),
        partnersTrackingEm: r(master.partnersTrackingEm),
      },
      report,
    },
    null,
    2,
  ),
);
console.table(report);
console.log("LINKER cap height @100:", r(capL), " clear space:", r(capL * 0.5));

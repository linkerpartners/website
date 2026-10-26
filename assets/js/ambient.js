/* ==========================================================
   배경 분위기 (모든 페이지, ambient.css와 한 벌): 흐르는 실과 빛결
   화면 뒤에 고정된 canvas 하나에 아주 가는 실 다발이 비단처럼 일렁이고, 실 위로 옅은 빛결이 아주 천천히 지나갑니다.
   - 실 다발 여섯 개, 다발마다 다섯 가닥이 위상을 조금씩 달리해 겹쳐 흐름. 양끝은 옅어져 사라짐
   - 빛결: 가닥을 따라 밝은 구간 하나가 30–50초에 한 번씩 천천히 지나감(실이 햇빛을 받는 느낌)
   - 마우스: 실을 건드리지 않고, 화면 전체가 커서 반대쪽으로 아주 조금(±12px) 따라 움직이는 깊이감만 줌(부드럽게 천천히)
   - 스크롤: 다발마다 다른 속도로 따라 움직이고(시차), 빠를수록 흐름이 잠깐 빨라졌다 가라앉음
   - 가장 진한 곳도 바탕에 12–18%, 선 두께 1px 이하라 글자 대비에 영향이 없음. 마우스를 막지 않음.
   - 동작 줄이기에서는 멈춘 한 장면만, 탭이 가려지거나 메뉴가 열려 있는 동안에는 쉼
   - 손가락 기기 · 좁은 화면(900px 미만)에서는 가볍게: 금빛 다발 3개 · 각 3가닥 · 넓은 간격 · 초당 30프레임 (배터리 · 스크롤 부드러움)
   ========================================================== */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const canvas = document.createElement("canvas");
  canvas.className = "ambient";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // y: 화면 높이 비율, amp: 일렁이는 폭(px), f: 가로 주파수, sp: 흐르는 속도, par: 스크롤 시차, c: 색(r,g,b), a: 농도, sheen: 빛결이 한 바퀴 도는 데 걸리는 초
  const ALL = [
    { y: 0.12, amp: 42, f: 0.0038, sp: 0.09, par: 0.08, c: "184,146,84", a: 0.17, sheen: 42 },
    { y: 0.3, amp: 62, f: 0.0029, sp: -0.07, par: 0.16, c: "140,150,168", a: 0.13, sheen: 36 },
    { y: 0.48, amp: 50, f: 0.0043, sp: 0.07, par: 0.05, c: "184,146,84", a: 0.16, sheen: 48 },
    { y: 0.66, amp: 70, f: 0.0026, sp: -0.085, par: 0.2, c: "140,150,168", a: 0.12, sheen: 40 },
    { y: 0.82, amp: 44, f: 0.0047, sp: 0.08, par: 0.1, c: "184,146,84", a: 0.15, sheen: 34 },
    { y: 0.96, amp: 56, f: 0.0033, sp: -0.06, par: 0.14, c: "140,150,168", a: 0.11, sheen: 46 },
  ];
  const light = !finePointer || window.innerWidth < 900;
  const BUNDLES = light
    ? ALL.filter(function (b, i) {
        return i % 2 === 0;
      })
    : ALL;
  const STRANDS = light ? 3 : 5;
  const STEP = light ? 40 : 28;
  const FRAME = light ? 33 : 0; // 가벼운 모드의 최소 프레임 간격(ms)
  let lastDraw = 0;
  const m = { x: 0, y: 0, ex: 0, ey: 0 }; // -1 ~ 1 (화면 가운데가 0)
  let W = 0;
  let H = 0;
  let phase = 0;
  let boost = 0;
  let lastScroll = window.scrollY || 0;
  let last = performance.now();

  function size() {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = innerWidth;
    H = innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    const sy = window.scrollY || 0;
    const t = now / 1000;
    BUNDLES.forEach(function (B, n) {
      let base = B.y * H - sy * B.par;
      base = ((((base + 140) % (H + 280)) + (H + 280)) % (H + 280)) - 140;
      // 마우스 깊이감: 다발마다 다른 폭으로 반대쪽으로 살짝
      const dx = -m.ex * (6 + n * 1.2);
      const dy = -m.ey * (4 + n * 0.8);
      // 빛결: 가로로 지나가는 밝은 구간(0 ~ 1)
      const c = (((t / B.sheen + n * 0.19) % 1) + 1) % 1;
      const mid = -0.25 + c * 1.5;
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      const stop = function (p, a) {
        grad.addColorStop(Math.max(0, Math.min(1, p)), "rgba(" + B.c + "," + Math.max(0, a).toFixed(3) + ")");
      };
      grad.addColorStop(0, "rgba(" + B.c + ",0)");
      stop(0.18, B.a * 0.55);
      stop(mid - 0.22, B.a * 0.55);
      stop(mid, Math.min(0.34, B.a * 2.1));
      stop(mid + 0.22, B.a * 0.55);
      stop(0.82, B.a * 0.55);
      grad.addColorStop(1, "rgba(" + B.c + ",0)");
      // 위 stop 순서가 어긋나지 않게 0~1 밖으로 나간 값은 잘라 둠
      ctx.strokeStyle = grad;
      for (let s = 0; s < STRANDS; s++) {
        const off = s * 6 - (STRANDS - 1) * 3;
        const ph = phase * B.sp * 6.2832 + n * 1.7 + s * 0.26;
        const mid2 = s === (STRANDS >> 1);
        ctx.lineWidth = mid2 ? 1 : 0.7;
        ctx.globalAlpha = mid2 ? 1 : 0.65;
        ctx.beginPath();
        let px = -STEP;
        let py = 0;
        for (let x = -STEP; x <= W + STEP; x += STEP) {
          const y = base + off + dy + B.amp * Math.sin((x + dx) * B.f + ph) + B.amp * 0.45 * Math.sin((x + dx) * B.f * 2.3 - ph * 1.3 + s * 0.2);
          if (x === -STEP) ctx.moveTo(x, y);
          else ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
          px = x;
          py = y;
        }
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    if (document.hidden || document.documentElement.classList.contains("is-menu")) {
      last = now;
      requestAnimationFrame(loop);
      return;
    }
    if (FRAME && now - lastDraw < FRAME) {
      requestAnimationFrame(loop);
      return;
    }
    lastDraw = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const sy = window.scrollY || 0;
    const v = Math.min(1, Math.abs(sy - lastScroll) / 60);
    lastScroll = sy;
    boost += (v - boost) * 0.08;
    phase += dt * (1 + boost * 5);
    m.ex += (m.x - m.ex) * 0.035;
    m.ey += (m.y - m.ey) * 0.035;
    draw(now);
    requestAnimationFrame(loop);
  }

  size();
  window.addEventListener("resize", function () {
    size();
    if (reduce.matches) draw(performance.now());
  });
  requestAnimationFrame(function () {
    canvas.classList.add("is-on");
  });
  if (reduce.matches) {
    phase = 3;
    draw(12000);
    return;
  }
  if (finePointer) {
    window.addEventListener(
      "pointermove",
      function (e) {
        m.x = (e.clientX / innerWidth) * 2 - 1;
        m.y = (e.clientY / innerHeight) * 2 - 1;
      },
      { passive: true },
    );
  }
  requestAnimationFrame(loop);
})();

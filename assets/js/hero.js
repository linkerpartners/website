/* ==========================================================
   홈 첫 화면: 사진 없이 큰 문장 두 줄 + 뒤에서 흐르는 KOREA · JAPAN 글자
   - 문장은 줄(
)마다 가림막 칸(.hl)으로 나뉘어 처음에 한 줄씩 솟아오름 (번역이 바뀌면 다시 나눔)
   - 첫 화면은 190svh, 안의 장면이 화면에 붙어 있고(sticky) 스크롤 진행(0 → 1)을 --hp로 넘김: CSS가 글자 두 줄을 서로 반대로 흘리고,
     문장은 위로 지우고 같은 화면에서 회사 소개를 차례로 연 뒤에 화면이 내려가게 함
   - 동작 줄이기에서는 --hp를 0으로 고정
   ========================================================== */
(function () {
  "use strict";
  const box = document.querySelector("[data-hero-scroll]");
  if (!box) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const line = box.querySelector(".hero-line");
  const clamp = function (v) {
    return Math.max(0, Math.min(1, v));
  };

  function split() {
    const text = (window.LP_I18N && LP_I18N.t(line.dataset.i18n)) || "";
    if (!text) return;
    line.textContent = "";
    text.split("\n").forEach(function (t, k) {
      const hl = document.createElement("span");
      hl.className = "hl";
      hl.style.setProperty("--k", String(k));
      const s = document.createElement("span");
      s.textContent = t;
      hl.appendChild(s);
      line.appendChild(hl);
    });
    line.setAttribute("aria-label", text.replace(/\n/g, " "));
    // 다음 프레임에 들어오는 효과를 시작 (처음 한 번 + 언어를 바꿀 때)
    line.classList.remove("is-in");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        line.classList.add("is-in");
      });
    });
  }

  // 스크롤 위치(target)를 그대로 쓰지 않고 프레임마다 부드럽게 따라가게(cur) 해서, 휠이 칸 단위로 움직여도 끊기지 않게 함
  let target = 0;
  let cur = 0;
  let running = false;
  function read() {
    const span = box.offsetHeight - window.innerHeight;
    target = reduce.matches || span <= 0 ? 0 : clamp(-box.getBoundingClientRect().top / span);
  }
  function tick() {
    cur += (target - cur) * 0.14;
    if (Math.abs(target - cur) < 0.0004) cur = target;
    box.style.setProperty("--hp", cur.toFixed(4));
    if (cur !== target) requestAnimationFrame(tick);
    else running = false;
  }
  function update() {
    read();
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  }

  document.addEventListener("lp:langchange", function () {
    split();
    update();
  });
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  read();
  cur = target;
  update();
})();

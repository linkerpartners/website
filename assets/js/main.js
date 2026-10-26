/* 모든 페이지가 가장 마지막에 불러오는 시작 파일
   1) 헤더·메뉴·푸터 그리기 → 번역 → 등장 효과 지켜보기
   2) 첫 화면 연출: 인트로나 페이지 전환 막이 걷힌 뒤 data-hero 요소에 한꺼번에 .is-inview
   3) 헤더: 내려가면 숨고 올라가면 유리로 / 메뉴 서랍 (바깥을 누르거나 Esc로 닫힘)
   4) 페이지 전환 막: 사이트 안 링크를 누르면 흰 막이 덮고, 새 페이지에서 걷힘 */
(function () {
  "use strict";
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  LP_COMPONENTS.render();

  /* ---------- 1. 등장 효과 ---------- */
  const io =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-inview");
              // wipe는 자기 모양이 가려져 있어 브라우저가 '보임'으로 치지 않으므로, 감싼 칸이 보이면 함께 엶
              if (entry.target._wipes) entry.target._wipes.forEach(function (w) { w.classList.add("is-inview"); });
              io.unobserve(entry.target);
            });
          },
          { rootMargin: "0px 0px -12% 0px" },
        )
      : null;

  // data-stagger 안의 등장 요소에 차례 번호(--i)
  function stagger() {
    document.querySelectorAll("[data-stagger]").forEach(function (box) {
      box.querySelectorAll(":scope > [data-reveal], :scope > * > [data-reveal]").forEach(function (n, i) {
        if (!n.style.getPropertyValue("--i")) n.style.setProperty("--i", String(Math.min(i, 8)));
      });
    });
  }

  // 등장 모양 돌리기: 구역(section)마다 다른 모양을 써서 한 가지로만 나오지 않게 함.
  // data-reveal="rise"인 곳 중 data-keep · data-hero가 없는 곳만 바꾸고, left는 둘째 줄부터 left · right를 번갈아 씀
  const MIX = ["rise", "left", "zoom", "right", "wipe", "rise"];
  function variety() {
    document.querySelectorAll("#main > section").forEach(function (sec, si) {
      const v = MIX[si % MIX.length];
      if (v === "rise") return;
      sec.querySelectorAll('[data-reveal="rise"]:not([data-keep]):not([data-hero]):not([data-v])').forEach(function (n, i) {
        n.dataset.reveal = v === "left" && i % 2 === 1 ? "right" : v;
        n.dataset.v = "1";
      });
    });
  }

  // 번역 목록(data-list)은 언어를 바꿀 때마다 새로 그려지므로, 그때마다 새 요소를 다시 지켜봄
  function watch() {
    variety();
    stagger();
    document.querySelectorAll("[data-reveal]:not(.is-inview):not([data-hero])").forEach(function (n) {
      if (!io) n.classList.add("is-inview");
      else if (n.dataset.reveal === "wipe" && n.parentElement) {
        const host = n.parentElement;
        (host._wipes = host._wipes || []).push(n);
        io.observe(host);
      } else io.observe(n);
    });
  }
  document.addEventListener("lp:langchange", watch);
  document.addEventListener("lp:listchange", watch); // 스크립트가 나중에 그린 목록 (사례 갤러리 등)

  /* ---------- 2. 첫 화면 연출 ---------- */
  let textReady = false;
  let stageReady = !root.classList.contains("is-intro") && !root.classList.contains("is-arriving");

  function play() {
    if (!textReady || !stageReady || root.classList.contains("is-ready")) return;
    root.classList.add("is-ready");
    document.querySelectorAll("[data-hero]").forEach(function (n) {
      n.classList.add("is-inview");
    });
    document.dispatchEvent(new CustomEvent("lp:ready"));
  }

  document.addEventListener("lp:introdone", function () {
    stageReady = true;
    // 인트로 막이 걷히는 동안 시작 (막과 제목이 함께 움직이도록 0.25초 뒤)
    setTimeout(play, 250);
  });

  // 페이지 전환 막: 번역이 채워진 뒤 위로 걷힘
  function lift() {
    if (!root.classList.contains("is-arriving")) return;
    requestAnimationFrame(function () {
      root.classList.add("is-arrived");
      setTimeout(function () {
        stageReady = true;
        play();
      }, 280);
      setTimeout(function () {
        root.classList.remove("is-arriving", "is-arrived");
      }, 950);
    });
  }

  document.addEventListener(
    "lp:langchange",
    function () {
      textReady = true;
      lift();
      play();
    },
    { once: true },
  );

  LP_I18N.init();
  watch();


  /* ---------- 3. 헤더 · 메뉴 ---------- */
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.getElementById("site-menu");
  const outside = [document.getElementById("main"), document.querySelector(".site-footer"), document.querySelector(".skip-link")];
  let open = false;

  function setMenu(next) {
    if (!menu || next === open) return;
    open = next;
    menu.classList.toggle("is-open", open);
    root.classList.toggle("is-menu", open); // ambient.js가 보고 배경 그리기를 쉼
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    root.style.overflow = open ? "hidden" : "";
    outside.forEach(function (n) {
      if (n) n.inert = open;
    });
    if (open) {
      setTimeout(function () {
        const first = menu.querySelector("a");
        if (first && open) first.focus({ preventScroll: true });
      }, 450);
    }
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      setMenu(!open);
    });
    menu.addEventListener("click", function (e) {
      // 서랍 바깥(흐린 페이지)을 누르면 닫힘
      if (e.target.closest("[data-menu-close]")) {
        setMenu(false);
        toggle.focus();
        return;
      }
      const a = e.target.closest("a");
      // 지금 페이지를 다시 고르면 닫기만
      if (a && a.getAttribute("aria-current") === "page") {
        e.preventDefault();
        setMenu(false);
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && open) {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  let lastY = window.scrollY;
  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 8);
    if (!open) {
      if (y > 200 && y > lastY + 4) header.classList.add("is-hidden");
      else if (y < lastY - 4 || y <= 200) header.classList.remove("is-hidden");
    }
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // 키보드로 헤더 안에 들어오면 숨은 헤더를 다시 보여 줌
  header.addEventListener("focusin", function () {
    header.classList.remove("is-hidden");
  });

  /* ---------- 4. 페이지 전환 막 ---------- */
  function isInternal(a, e) {
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (a.target && a.target !== "_self") return false;
    if (a.hasAttribute("download") || a.origin !== location.origin) return false;
    // 같은 페이지 안의 이동(#)은 막 없이
    if (a.pathname === location.pathname && a.search === location.search) return false;
    return /\.html$|\/$/.test(a.pathname);
  }

  document.addEventListener("click", function (e) {
    const a = e.target.closest("a[href]");
    if (reduce.matches || !isInternal(a, e)) return;
    e.preventDefault();
    try {
      sessionStorage.setItem("lp_nav", "1");
    } catch (err) {}
    const curtain = document.createElement("div");
    curtain.className = "curtain";
    curtain.setAttribute("aria-hidden", "true");
    document.body.appendChild(curtain);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        curtain.classList.add("is-covering");
      });
    });
    setTimeout(function () {
      location.href = a.href;
    }, 620);
  });

  // 뒤로 가기로 돌아왔을 때(페이지 보관) 막이 덮인 채 남지 않게
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    document.querySelectorAll(".curtain").forEach(function (c) {
      c.remove();
    });
    if (open) setMenu(false);
  });
})();

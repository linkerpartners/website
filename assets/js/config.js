/* LINKERPARTNERS 공통 설정 - 회사 정보, 메뉴, 비용은 여기서만 수정합니다. */
window.LP_CONFIG = {
  siteName: "LINKERPARTNERS", // 회사 정식 이름 (페이지 제목·스크린리더)

  // 사이트 맨 위 주소(끝에 /). 한국어는 맨 위, 일본어 · 영어는 /ja/ · /en/ 폴더의 페이지라서
  // assets · i18n · data는 이 파일의 위치에서 찾습니다. 직접 수정하지 마세요.
  root: document.currentScript.src.split("assets/js/config.js")[0],

  // 로고 파일 (tools/logo/build-logo.cjs로 생성. 직접 수정하지 마세요)
  logo: {
    headerPc: { src: "assets/logo/linker-logo-header-pc.svg", width: 88, height: 29 }, // LINKER 22px
    headerMobile: { src: "assets/logo/linker-logo-header-mobile.svg", width: 76, height: 26 }, // LINKER 19px
    full: "assets/logo/linker-logo.svg", // 큰 사용 (푸터·명함 등)
  },
  defaultLang: "ko",
  supportedLangs: ["ko", "ja", "en"],
  // 언어별 폴더: 한국어는 맨 위, 나머지는 하위 폴더 (tools/build가 이 구조로 페이지를 만듦)
  langDirs: { ko: "", ja: "ja/", en: "en/" },
  pages: ["index", "about", "services", "pricing", "cases", "insights", "contact", "privacy", "terms"], // 언어별로 만들어지는 페이지(src/)
  // 언어 메뉴에 보이는 이름: 앞 두 글자 이니셜만 (헤더 지구본 메뉴)
  langNames: { ko: "KO", ja: "JA", en: "EN" },

  // 연락처 (화면의 모든 이메일 · 전화번호가 여기서 읽힙니다)
  email: "contact@linkerpartners.com",
  phone: "07050871374", // 숫자만 (tel: 링크용)
  phoneDisplay: "070-5087-1374", // 화면에 보이는 모양
  // SNS 주소: 정해지면 href에 넣으세요. 비워 두면 버튼은 보이되 눌러도 이동하지 않습니다.
  social: [
    { id: "kakao", href: "" },
    { id: "instagram", href: "" },
    { id: "line", href: "" },
  ],

  // 메뉴: 각 항목은 별도 페이지로 이동합니다. key는 번역 파일(nav.○○)과 연결됩니다.
  nav: [
    { key: "about", href: "about.html" },
    { key: "services", href: "services.html" },
    { key: "pricing", href: "pricing.html" },
    { key: "cases", href: "cases.html" },
    { key: "insights", href: "insights.html" },
  ],
  // 헤더 오른쪽 버튼 (문의 페이지)
  cta: { key: "header.cta", href: "contact.html" },
  // 푸터 바로가기
  footerNav: [
    { key: "about", href: "about.html" },
    { key: "services", href: "services.html" },
    { key: "pricing", href: "pricing.html" },
    { key: "cases", href: "cases.html" },
    { key: "insights", href: "insights.html" },
    { key: "contact", href: "contact.html" },
    { key: "terms", href: "terms.html" },
    { key: "privacy", href: "privacy.html" },
  ],

  // ⚠ 비용 (5~100만 원 소규모 컨설팅 · 제작 기준 예시 금액입니다. 확정되면 바꿔 주세요)
  // 금액은 이 한 곳에서만 관리하고, 화면의 모든 가격 · 요금표 · 견적 계산기가 여기서 읽습니다. (pricing.js)
  // - 금액은 원(KRW)으로만 적습니다. 엔화는 jpyPerKrw로 바꿔 1,000엔 단위로 반올림해 보여 줍니다.
  // - tiers: 단계별 금액 (첫 번째가 '부터' 금액)  · unit: 한 건/하루/한 달 금액 (수량을 곱함)
  // - weeks: [최소, 최대] 기간(주)
  pricing: {
    jpyPerKrw: 0.118, // 1원 = 0.118엔 (참고 환율)
    vat: 0.1, // 부가세 10% (견적 계산기에서 따로 표시)
    rush: 0.2, // 빠른 진행: 소계의 20% 추가
    items: {
      spot: { krw: 50000, weeks: [0, 1] }, // 1:1 집중 상담 60분
      diagnostic: { tiers: { basic: 150000, deep: 300000 }, weeks: { basic: [1, 2], deep: [2, 3] } }, // 진출 진단 리포트
      logo: { tiers: { basic: 200000, deep: 500000 }, weeks: { basic: [1, 2], deep: [2, 3] } }, // 로고 · 브랜드 디자인
      web: { tiers: { basic: 400000, deep: 900000 }, weeks: { basic: [2, 3], deep: [3, 5] } }, // 홈페이지 제작
      booking: { tiers: { basic: 300000, deep: 800000 }, weeks: { basic: [1, 2], deep: [3, 4] } }, // 예약 시스템 구축
      sns: { tiers: { basic: 250000, deep: 600000 }, weeks: { basic: [1, 1], deep: [2, 3] } }, // SNS · 광고 운영 도움
      localization: { unit: 100000, weeks: [1, 2] }, // 자료 1건 (상세페이지 · 브랜드 소개 · 상품 이름 등)
      channel: { tiers: { basic: 200000, deep: 450000 }, weeks: { basic: [1, 2], deep: [2, 3] } }, // 입점 준비 가이드
      advisory: { tiers: { light: 100000, standard: 300000 }, monthly: true }, // 월간 멘토링 (월 금액)
    },
    // 패키지: 묶음 금액과 들어 있는 것 (견적 계산기가 '묶으면 더 저렴해요'를 알려 줄 때 씀)
    packages: {
      check: { krw: 170000, includes: { spot: 1, diagnostic: "basic" } },
      brand: { krw: 380000, includes: { spot: 1, logo: "basic", localization: 2 } },
      launch: { krw: 850000, includes: { logo: "basic", web: "basic", sns: "basic", localization: 2 } },
    },
  },

  // 사례: data/cases/index.json의 순서대로 data/cases/<id>/case.json을 읽어 갤러리로 그립니다. (cases.js)
  cases: { dir: "data/cases" },
};

// 파일 경로를 맨 위 주소 기준의 전체 주소로 (폴더 깊이가 달라도 같은 파일을 읽도록)
(function (c) {
  c.logo.headerPc.src = c.root + c.logo.headerPc.src;
  c.logo.headerMobile.src = c.root + c.logo.headerMobile.src;
  c.logo.full = c.root + c.logo.full;
  c.cases.dir = c.root + c.cases.dir;
})(window.LP_CONFIG);

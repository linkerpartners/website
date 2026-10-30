# LINKERPARTNERS 웹사이트 (V1)

한국 · 일본 사이에서 판매하려는 처음 나서는 1인 사업자 · 브랜드 · 스타트업을 위한 한일 진출 컨설팅 사이트. 빌드 도구 없이 HTML · CSS · JS만으로 된 정적 사이트입니다(한국어 · 일본어 · 영어).

## 보기

`file://`로 열면 번역 · 사례 파일을 읽지 못하므로, 이 폴더를 간단한 서버로 열어야 해요. 주소: 한국어 `/` · 일본어 `/ja/` · 영어 `/en/`.

```
npx serve .          # 또는
python -m http.server 8765
```

그다음 `http://localhost:8765/index.html`을 엽니다. 디자인 시스템은 `design-system.html`입니다.

## 어디를 고치면 되나

| 바꾸고 싶은 것 | 파일 |
|---|---|
| 페이지 구조(HTML) | `src/*.html` — 루트의 `*.html` · `ja/` · `en/`은 **빌드가 만든 파일**이라 직접 고치지 않음 |
| 화면의 모든 문구 (한 · 일 · 영) | `i18n/ko.json` · `ja.json` · `en.json` (세 파일의 키가 같아야 함) |
| 이메일 · 전화 · SNS 주소 · 메뉴 · **모든 금액** | `assets/js/config.js` |
| 사례 추가 · 수정 | `data/cases/` ([넣는 법](data/cases/README.md)) |
| 색 · 글자 크기 · 간격 같은 값 | `assets/css/tokens.css` |
| 글꼴 파일(자체 호스팅) | `assets/fonts/` · `assets/css/fonts.css` (바꿀 때만 `tools/build`에서 `node fonts.cjs`) |
| 문의 폼 전송 방식 | `assets/js/contact.js`의 `send()` |
| 사이트 주소 · 공유 이미지(검색 · 공유용) | `tools/build/site.json` |

## 고친 뒤 빌드

`src/*.html` · `i18n/*.json`을 고치면 일본어 · 영어 페이지를 다시 만들어야 화면에 반영돼요(처음 한 번만 `npm install`).

```
cd tools/build
npm install      # 처음 한 번
npm run build    # 페이지 24개 · sitemap.xml · robots.txt 생성
```

빌드는 번역 키가 빠진 곳이 있으면 알려 줍니다. CSS · JS · 사례(`data/cases`) · `config.js`는 빌드 없이 바로 반영돼요.

## 문구 전수조사

사이트의 한국어 문구를 한 번에 점검하려면 저장소 맨 위에서 `node tools/audit/korean-audit.cjs`를 실행하세요. 한국어 전체 문구 · 사례 문구 · 코드에 직접 쓴 한글 · 일본어/영어 화면에 섞인 한글 · 점검 패턴(부정 표현, 호칭 등)에 걸린 문장이 표(CSV)와 `요약.md`로 `docs/내부/문구-검수/한국어-전수조사/`에 만들어져요. 사이트 파일은 바꾸지 않습니다. 점검 패턴은 스크립트 위쪽 `PATTERNS`에서 고칩니다.

## 문서

- [DESIGN.md](DESIGN.md) · [design-system.html](design-system.html): 디자인 시스템(색 · 글자 · 부품 · 움직임 · 모바일 규칙)
- [docs/배포-가이드.md](docs/배포-가이드.md): 올리기 전 빌드 · 올릴 것 / 올리지 않을 것 · 보안 헤더 · 확인 목록

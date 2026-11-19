# 미니게임 사이트 작업 규칙

## 구조
- `config.json`: 사이트 설정. `adsEnabled`, `adsenseClient`, `adsenseSlot`, `analyticsToken`, `sections`(목록 섹션 순서와 모양: `grid2`, `grid3`, `list`)
- `games.json`: 게임 목록. 항목 순서가 섹션 안 카드 순서
- `games/<slug>/game.html`: 게임 원본
- `pages/about.html`, `pages/privacy.html`: 본문만 적는 원본. `<!-- if:ads -->`, `<!-- if:analytics -->` ... `<!-- endif -->` 는 설정이 켜졌을 때만 남음
- `build.js`: Node 기본 모듈만 사용. 외부 패키지 추가 금지
- `docs/`: 빌드 결과. 손으로 고치지 말고 `node build.js` 로 다시 만든 뒤 커밋

## games.json 항목
- `slug`: 폴더 이름, 주소에 쓰임 (영문, 숫자, `-`)
- `title`, `date`(YYYY-MM-DD)
- `status`: `진행 중` | `실험 중` | `접은 아이디어`
- `section`: 목록에서 묶을 그룹. `config.json` 의 `sections` 에 없으면 맨 뒤에 2칸 격자로 붙음. `접은 아이디어` 는 항상 맨 아래
- `summary`: 카드 설명. 문자열 배열(한 줄씩). `{사과:#3f8fe0}` 은 그 색 사과 아이콘
- `howTo`, `story`: 3~5문장 쉬운 한국어. 줄바꿈(`\n`)은 문단 나눔

## 새 게임 추가 순서
1. `games/<slug>/game.html` 넣기
2. `games.json` 에 항목 추가
3. `node build.js` 실행, 오류 없는지 확인
4. 커밋 후 푸시 (push 전에는 사용자에게 먼저 물어보기)

## 규칙
- 코드, 주석, 문서 어디에도 em dash 문자(U+2014)를 쓰지 않는다
- 주석은 한국어로 짧게
- `game.html` 안의 게임 로직은 건드리지 않는다. 옮기거나 복사만 한다
- 예전 주소(루트의 `<slug>.html`)는 빌드가 자동으로 새 게임 페이지로 넘기는 파일을 만든다. 블로그 링크가 있으니 slug 를 바꾸지 않는다
- 작업이 끝나면 `node build.js` 로 `docs/index.html` 과 게임 페이지가 제대로 나오는지 확인하고 커밋한다

# 미니게임 사이트 작업 규칙

## 구조
- `config.json`: 사이트 설정. `adsEnabled`, `adsenseClient`, `adsenseSlot`, `analyticsToken`, `contactEmail`(문의 메일, 비우면 안 나옴), `sections`(목록 섹션 순서와 모양: `grid2`, `grid3`, `list`)
- `games.json`: 게임 목록. 항목 순서가 섹션 안 카드 순서
- `games/<slug>/game.html`: 게임 원본
- 빌드가 만드는 게임 페이지: `games/<slug>/` 소개 페이지 (게임하기, 하는 법 버튼, 랭킹, 만든 이야기, 광고 자리), `games/<slug>/play.html` 게임하기 페이지 (게임만 화면 가득, 구석에 나가기 버튼). 모두 build.js 템플릿에서 고친다
- `pages/about.html`, `pages/privacy.html`: 본문만 적는 원본. `<!-- if:ads -->`, `<!-- if:analytics -->` ... `<!-- endif -->` 는 설정이 켜졌을 때만 남음. `<!-- mail -->` 자리에 문의 메일 링크가 들어감
- `build.js`: Node 기본 모듈만 사용. 외부 패키지 추가 금지
- `docs/`: 빌드 결과. 손으로 고치지 말고 `node build.js` 로 다시 만든 뒤 커밋
- `assets/ranking.js`: 공통 랭킹 화면. 빌드가 `docs/ranking.js` 로 복사
- `functions/api/ranking.js`: 랭킹 API (Cloudflare Pages Functions, D1 바인딩 `DB`, DB 이름 `mini-games-db`)
- `schema.sql`: D1 스키마. `badwords.json`: 닉네임 욕설 목록

## games.json 항목
- `slug`: 폴더 이름, 주소에 쓰임 (영문, 숫자, `-`)
- `title`, `date`(YYYY-MM-DD)
- `status`: `진행 중` | `실험 중` | `접은 아이디어`
- `section`: 목록에서 묶을 그룹. `config.json` 의 `sections` 에 없으면 맨 뒤에 2칸 격자로 붙음. `접은 아이디어` 는 항상 맨 아래
- `summary`: 카드 설명. 문자열 배열(한 줄씩). `{사과:#3f8fe0}` 은 그 색 사과 아이콘
- `howTo`, `story`: 3~5문장 쉬운 한국어. 줄바꿈(`\n`)은 문단 나눔
- `ranking`: `true` 면 랭킹 사용 (없으면 꺼짐). `maxScore`: 이보다 큰 점수는 서버가 거절

## 랭킹 켜는 법
1. `games.json` 그 게임에 `"ranking": true` (필요하면 `maxScore`)
2. `game.html` 의 `gameOver` 함수 끝에 한 줄만 추가: `if (window.Ranking) Ranking.show({ game: '<slug>', score: score, playTime: playTime });` (플레이 시간 변수가 없으면 `playTime` 생략)
3. `node build.js`. 빌드가 그 게임의 `game.html` 에 `ranking.js` 스크립트를 넣고, 게임 페이지에 TOP 10 칸을 만든다

## 새 게임 추가 순서
1. `games/<slug>/game.html` 넣기
2. `games.json` 에 항목 추가
3. `node build.js` 실행, 오류 없는지 확인
4. 커밋 후 푸시 (push 전에는 사용자에게 먼저 물어보기)

## 규칙
- 메일 주소는 HTML 에 그대로 쓰지 않는다. `config.json` 의 `contactEmail` 만 고치면 빌드가 자바스크립트로 조합해서 보여준다
- 코드, 주석, 문서 어디에도 em dash 문자(U+2014)를 쓰지 않는다
- 주석은 한국어로 짧게
- `game.html` 안의 게임 로직은 건드리지 않는다. 옮기거나 복사만 한다 (예외: 랭킹용 `Ranking.show` 한 줄)
- 예전 주소(루트의 `<slug>.html`)는 빌드가 자동으로 새 게임 페이지로 넘기는 파일을 만든다. 블로그 링크가 있으니 slug 를 바꾸지 않는다
- 작업이 끝나면 `node build.js` 로 `docs/index.html` 과 게임 페이지가 제대로 나오는지 확인하고 커밋한다

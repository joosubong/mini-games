# 부엌강아지 미니게임 실험실

https://joosubong.github.io/mini-games/

## 새 게임 추가하는 법

1. `games/<slug>/game.html` 에 게임 파일 넣기 (slug 는 영문, 숫자, `-` 만)
2. `games.json` 에 한 항목 추가 (slug, title, status, section, summary, howTo, story, date)
3. `node build.js`
4. 커밋, 푸시 (`docs/` 폴더도 같이)

## 랭킹 켜는 법

1. `games.json` 그 게임 항목에 `"ranking": true` (필요하면 `"maxScore": 숫자` 로 점수 상한)
2. `game.html` 의 `gameOver` 함수 끝에 한 줄 추가
   `if (window.Ranking) Ranking.show({ game: '<slug>', score: score, playTime: playTime });`
   (플레이 시간 변수가 없으면 `playTime` 은 빼도 됨)
3. `node build.js`

모드마다 랭킹을 나누려면 `"rankingModes": [{ "key": "basic", "name": "기본" }, ...]` 를 넣고, 게임에서는 `game: '<slug>:<key>'` 로 부르면 됨.

욕설 목록은 `badwords.json` 에 추가하면 됨. 서버는 `functions/api/ranking.js`, DB 스키마는 `schema.sql`.

## 구조

- `config.json` 사이트 설정 (광고, 통계 켜고 끄기, 문의 메일 contactEmail, 목록 섹션 순서)
- `games.json` 게임 목록
- `games/<slug>/game.html` 게임 원본
- `pages/` 소개, 개인정보처리방침 원본
- `build.js` 사이트 만드는 스크립트 (Node 만 있으면 됨)
- `docs/` 만들어진 사이트 (GitHub Pages, Cloudflare Pages 가 여기를 공개)
  - `docs/games/<slug>/` 게임 소개 페이지, `docs/games/<slug>/play.html` 게임만 나오는 화면
- `assets/ranking.js` 게임들이 같이 쓰는 랭킹 화면 (빌드 때 `docs/ranking.js` 로 복사)
- `functions/` Cloudflare Pages Functions (랭킹 API, D1 바인딩 이름 `DB`)

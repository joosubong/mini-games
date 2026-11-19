# 부엌강아지 미니게임 실험실

https://joosubong.github.io/mini-games/

## 새 게임 추가하는 법

1. `games/<slug>/game.html` 에 게임 파일 넣기 (slug 는 영문, 숫자, `-` 만)
2. `games.json` 에 한 항목 추가 (slug, title, status, section, summary, howTo, story, date)
3. `node build.js`
4. 커밋, 푸시 (`docs/` 폴더도 같이)

## 구조

- `config.json` 사이트 설정 (광고, 통계 켜고 끄기, 목록 섹션 순서)
- `games.json` 게임 목록
- `games/<slug>/game.html` 게임 원본
- `pages/` 소개, 개인정보처리방침 원본
- `build.js` 사이트 만드는 스크립트 (Node 만 있으면 됨)
- `docs/` 만들어진 사이트 (GitHub Pages, Cloudflare Pages 가 여기를 공개)

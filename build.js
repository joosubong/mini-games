// 미니게임 사이트 빌드 스크립트 (Node 기본 모듈만 사용)
// 사용법: node build.js  ->  docs/ 폴더에 사이트 전체를 만든다
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'docs');
const STATUS_CLASS = { '진행 중': '', '실험 중': 'try', '접은 아이디어': 'old' };

// ---------- 읽기, 검사 ----------
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const config = readJson('config.json');
const games = readJson('games.json');
const siteUrl = config.siteUrl.endsWith('/') ? config.siteUrl : config.siteUrl + '/';

const errors = [];
const seen = new Set();
for (const g of games) {
  const where = `games.json "${g.slug || g.title || '?'}"`;
  for (const k of ['slug', 'title', 'status', 'section', 'summary', 'date']) {
    if (!g[k]) errors.push(`${where}: ${k} 가 비어 있음`);
  }
  if (g.slug && !/^[a-zA-Z0-9-]+$/.test(g.slug)) errors.push(`${where}: slug 는 영문, 숫자, - 만 가능`);
  if (seen.has(g.slug)) errors.push(`${where}: slug 중복`);
  if (['about', 'privacy', 'index', 'sitemap', 'robots', 'games'].includes(g.slug)) errors.push(`${where}: 쓸 수 없는 slug`);
  seen.add(g.slug);
  if (g.status && !(g.status in STATUS_CLASS)) errors.push(`${where}: status 는 ${Object.keys(STATUS_CLASS).join(', ')} 중 하나`);
  if (g.slug && !fs.existsSync(path.join(ROOT, 'games', g.slug, 'game.html'))) errors.push(`${where}: games/${g.slug}/game.html 없음`);
  if ('ranking' in g && typeof g.ranking !== 'boolean') errors.push(`${where}: ranking 은 true 또는 false`);
  if ('maxScore' in g && !(Number.isSafeInteger(g.maxScore) && g.maxScore > 0)) errors.push(`${where}: maxScore 는 0보다 큰 정수`);
  if ('rankingModes' in g && !(Array.isArray(g.rankingModes) && g.rankingModes.length &&
    g.rankingModes.every(m => m && /^[a-z0-9-]+$/.test(m.key || '') && m.name))) errors.push(`${where}: rankingModes 는 [{ key(영문 소문자, 숫자, -), name }] 목록`);
}
if (errors.length) {
  console.error('빌드 중단:\n- ' + errors.join('\n- '));
  process.exit(1);
}

// ---------- 도우미 ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lines = v => (Array.isArray(v) ? v : String(v ?? '').split('\n')).filter(s => s !== '');
const write = (rel, text) => {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
};
const adsOn = !!(config.adsEnabled && config.adsenseClient);

// summary 한 줄 안의 {사과:#색} 을 사과 아이콘으로 바꾼다
const APPLE_RE = /\{사과:(#[0-9a-fA-F]{3,8})\}/g;
const hasApple = s => s.includes('{사과:');
function summaryLine(s) {
  const html = esc(s).replace(APPLE_RE, (_, c) => `<svg class="ap" viewBox="0 0 20 20" aria-hidden="true"><use href="#apple" style="color:${c}"/></svg>`);
  return hasApple(s) ? `<span class="ln">${html}</span>` : html;
}
// 여러 줄 summary 를 합침 (사과 줄은 자체로 줄바꿈되므로 그 뒤에는 <br> 안 넣음)
const summaryHtml = g => lines(g.summary).map((s, i, a) => (i && !hasApple(a[i - 1]) ? '<br>' : '') + summaryLine(s)).join('');
const plain = s => String(s).replace(APPLE_RE, '사과 ');
const summaryText = g => lines(g.summary).map(plain).join(', ');

// ---------- 공통 조각 ----------
const APPLE_SYMBOL = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><symbol id="apple" viewBox="0 0 20 20"><ellipse cx="7.3" cy="11.5" rx="5.4" ry="6" fill="currentColor"/><ellipse cx="12.7" cy="11.5" rx="5.4" ry="6" fill="currentColor"/><ellipse cx="7" cy="9.5" rx="1.4" ry="2.1" fill="#fff" opacity=".45" transform="rotate(20 7 9.5)"/><path d="M10 6 L10.8 2.6" stroke="#6b4a2e" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="13" cy="3.6" rx="2.4" ry="1.1" fill="#4fa33a" transform="rotate(-25 13 3.6)"/></symbol></defs></svg>';

const CSS = `:root{color-scheme:light dark;--bg:light-dark(#fdf3e1,#2a2018);--ink:light-dark(#4a3426,#f6e7d0);--card:light-dark(#fffaf0,#3a2c20);--line:light-dark(#e4cfae,#5a4430);--sub:light-dark(#7a6250,#cbb79f)}
*{box-sizing:border-box;margin:0;padding:0}
html{touch-action:manipulation;-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}
main{max-width:640px;margin:0 auto;padding:32px 16px 48px}
a{color:inherit}
h1{font-family:"Jua",sans-serif;font-size:34px;line-height:1.1;margin-bottom:8px}
h2{font-family:"Jua",sans-serif;font-size:24px;line-height:1.2;margin:28px 0 8px}
.lead{color:var(--sub);margin-bottom:24px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px}
.grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
.three a.sq{aspect-ratio:auto;min-height:150px}
.list{display:grid;gap:14px;margin-bottom:14px}
a.card{display:block;text-decoration:none;color:inherit;background:var(--card);border-radius:16px;padding:16px 18px;box-shadow:0 3px 0 var(--line);transition:transform .15s}
a.card:hover{transform:translateY(-2px)}
a.card:focus-visible{outline:3px solid #e2553f;outline-offset:3px}
a.sq{aspect-ratio:5/4;min-height:max-content;display:flex;flex-direction:column;justify-content:space-between;padding:14px}
.top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:4px}
.name{font-family:"Jua",sans-serif;font-size:22px;line-height:1.2}
.sq .name{font-size:20px}
.sub{display:block;font-family:"Jua",sans-serif;font-size:14px;line-height:1.35;color:var(--sub);margin-top:4px}
.ln{display:flex;align-items:center;gap:4px;white-space:nowrap}
.ap{width:18px;height:18px;flex:none}
.tag{font-size:13px;padding:2px 10px;border-radius:999px;white-space:nowrap;background:#e2553f;color:#fff;align-self:flex-start}
.tag.try{background:#8b6b4a}
.tag.old{background:#b3a593}
.desc{color:var(--sub);font-size:15px}
.home{display:inline-block;font-family:"Jua",sans-serif;font-size:17px;color:var(--sub);text-decoration:none;margin-bottom:18px}
.home:hover{color:var(--ink)}
.head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.head h1{margin:0}
.meta{color:var(--sub);font-size:14px;margin-bottom:16px}
.btns{display:flex;gap:10px;margin:4px 0 8px}
.btn{flex:1;display:flex;align-items:center;justify-content:center;min-height:58px;font-family:"Jua",sans-serif;font-size:22px;background:#e2553f;color:#fff;text-decoration:none;border-radius:16px;box-shadow:0 4px 0 #a83727}
.btn.sub2{background:#8b6b4a;box-shadow:0 4px 0 #5e4630}
.btn:active{transform:translateY(2px);box-shadow:0 2px 0 #a83727}
.btn:focus-visible{outline:3px solid #7cc36a;outline-offset:3px}
.howto{background:var(--card);border-radius:16px;padding:4px 18px 8px;margin-top:14px;box-shadow:0 3px 0 var(--line)}
.howto h2{margin-top:12px}
.prose p{margin-bottom:10px}
.prose ul{margin:0 0 10px 20px}
.back{display:inline-block;margin-top:28px;font-family:"Jua",sans-serif;font-size:18px}
.ranking{margin-top:28px;min-height:60px}
.ad{margin:20px 0;min-height:100px;text-align:center}
footer{margin-top:28px;font-size:13px;color:var(--sub)}
footer a{color:var(--sub)}
@media (max-width:480px){.sq .name{font-size:17px}.sub{font-size:12px}a.sq{padding:12px}.tag{font-size:12px;padding:2px 8px}}
@media (prefers-reduced-motion:reduce){a.card{transition:none}}`;

// 아이폰 사파리는 user-scalable=no 를 무시해서, 두 손가락 확대를 직접 막는다 (두 번 톡 확대는 CSS touch-action 으로 막음)
const NO_ZOOM = `(function(){var p=function(e){e.preventDefault()};['gesturestart','gesturechange','gestureend'].forEach(function(t){document.addEventListener(t,p,{passive:false})});` +
  `document.addEventListener('touchmove',function(e){if(e.touches.length>1)e.preventDefault()},{passive:false});})();`;

// 페이지 머리 (base: 사이트 루트까지의 상대 경로)
function head({ title, desc, canonical }) {
  const parts = [
    '<!DOCTYPE html>',
    '<html lang="ko">',
    '<head>',
    '<meta charset="UTF-8">',
    // 폰에서 확대, 축소 막기 (아이폰은 아래 스크립트로 한 번 더 막음)
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">',
    `<script>${NO_ZOOM}</script>`,
    `<title>${esc(title)}</title>`,
    desc ? `<meta name="description" content="${esc(desc)}">` : '',
    canonical ? `<link rel="canonical" href="${esc(canonical)}">` : '',
    `<meta property="og:title" content="${esc(title)}">`,
    desc ? `<meta property="og:description" content="${esc(desc)}">` : '',
    canonical ? `<meta property="og:url" content="${esc(canonical)}">` : '',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link href="https://fonts.googleapis.com/css2?family=Jua&display=swap" rel="stylesheet">',
    // 광고: adsEnabled 가 true 이고 adsenseClient 가 있을 때만
    adsOn ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(config.adsenseClient)}" crossorigin="anonymous"></script>` : '',
    `<style>\n${CSS}\n</style>`,
    '</head>',
  ];
  return parts.filter(Boolean).join('\n');
}

// 광고 자리 (꺼져 있으면 아무것도 안 넣음)
function adSlot() {
  if (!adsOn) return '';
  const slot = config.adsenseSlot ? ` data-ad-slot="${esc(config.adsenseSlot)}"` : '';
  return `<div class="ad"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(config.adsenseClient)}"${slot} data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`;
}

// 통계: analyticsToken 이 있을 때만
function analytics() {
  if (!config.analyticsToken) return '';
  return `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(config.analyticsToken)}"}'></script>`;
}

// 문의 메일: 주소를 HTML 에 그대로 쓰지 않고, 글자 코드를 섞어 두었다가 자바스크립트로 조합한다
const MAIL_SHIFT = 7;
const mailOn = !!config.contactEmail;
// label 이 있으면 그 글자를 보여주고, 없으면 메일 주소를 보여준다
function mailLink(label) {
  if (!mailOn) return '';
  return `<a class="mail" href="#"${label ? ' data-keep' : ''}>${label ? esc(label) : '메일 주소 보기'}</a><noscript> (메일 주소는 자바스크립트를 켜면 보여요)</noscript>`;
}
function mailScript() {
  if (!mailOn) return '';
  const codes = [...config.contactEmail].map(c => c.charCodeAt(0) + MAIL_SHIFT).reverse();
  return `<script>(function(){var m=String.fromCharCode.apply(null,[${codes.join(',')}].reverse().map(function(n){return n-${MAIL_SHIFT}}));` +
    `document.querySelectorAll('a.mail').forEach(function(a){a.href='mai'+'lto:'+m;if(!a.hasAttribute('data-keep'))a.textContent=m;});})();</script>`;
}

function footer(base) {
  const mail = mailOn ? ` · ${mailLink('문의')}` : '';
  return `<footer>만든 사람: ${esc(config.author)} · <a href="${base}about.html">소개</a> · <a href="${base}privacy.html">개인정보처리방침</a>${mail}</footer>`;
}

// 공통 머리말 (목록 페이지 말고 나머지 페이지 맨 위)
const topLink = base => `<a class="home" href="${base}">${esc(config.siteName)}</a>`;

function page({ title, desc, canonical, base, body, mainClass }) {
  return `${head({ title, desc, canonical })}
<body>
<main${mainClass ? ` class="${mainClass}"` : ''}>
${body}
${footer(base)}
</main>
${mailScript()}
${analytics()}
</body>
</html>
`.replace(/\n{2,}/g, '\n');
}

// ---------- 목록 페이지 ----------
function card(g, layout) {
  const tag = `<span class="tag${STATUS_CLASS[g.status] ? ' ' + STATUS_CLASS[g.status] : ''}">${esc(g.status)}</span>`;
  const href = `games/${g.slug}/`;
  if (layout === 'list') {
    return `    <a class="card" href="${href}">
      <div class="top"><span class="name">${esc(g.title)}</span>${tag}</div>
      <p class="desc">${summaryHtml(g)}</p>
    </a>`;
  }
  return `    <a class="card sq" href="${href}">
      <span class="name">${esc(g.title)}<span class="sub">${summaryHtml(g)}</span></span>
      ${tag}
    </a>`;
}

function buildIndex() {
  // config 의 sections 순서대로, 없는 섹션은 뒤에 2칸 격자로 붙이고, 접은 아이디어는 항상 맨 아래
  const order = (config.sections || []).map(s => ({ ...s }));
  for (const g of games) {
    if (!order.some(s => s.name === g.section)) order.push({ name: g.section, layout: 'grid2' });
  }
  order.sort((a, b) => (a.name === '접은 아이디어') - (b.name === '접은 아이디어'));

  const blocks = [];
  for (const s of order) {
    const list = games.filter(g => g.section === s.name);
    if (!list.length) continue;
    const cls = s.layout === 'list' ? 'list' : s.layout === 'grid3' ? 'grid three' : 'grid';
    blocks.push(`  <div class="${cls}" aria-label="${esc(s.name)}">\n${list.map(g => card(g, s.layout)).join('\n')}\n  </div>`);
  }

  const body = `${APPLE_SYMBOL}
  <h1>${esc(config.siteName)}</h1>
  <p class="lead">${esc(config.lead)}</p>
${blocks.join('\n')}
${adSlot()}`;
  write('index.html', page({ title: config.siteName, desc: config.lead, canonical: siteUrl, base: '', body }));
}

// ---------- 게임 페이지 ----------
// 랭킹 TOP 10 칸. rankingModes 가 있으면 모드마다 하나씩 ('<slug>:<모드>')
function rankingHtml(g, base) {
  const boards = g.rankingModes
    ? g.rankingModes.map(m => ({ id: `ranking-${m.key}`, game: `${g.slug}:${m.key}`, title: `${m.name} 모드 랭킹 TOP 10` }))
    : [{ id: 'ranking', game: g.slug }];
  return `${boards.map(b => `<div class="ranking" id="${b.id}"></div>`).join('\n')}
<script src="${base}ranking.js"></script>
<script>${boards.map(b => `Ranking.board(document.getElementById(${JSON.stringify(b.id)}), ${JSON.stringify(b.game)}${b.title ? ', ' + JSON.stringify(b.title) : ''});`).join('\n')}</script>`;
}

function paragraphs(text) {
  return lines(text).map(p => `<p>${esc(p)}</p>`).join('\n');
}

function buildGame(g) {
  const base = '../../';
  const tagCls = STATUS_CLASS[g.status] ? ' ' + STATUS_CLASS[g.status] : '';
  // 소개 페이지: 게임은 넣지 않고 [게임하기] [하는 법] 버튼으로 시작
  const howTo = g.howTo ? `<a class="btn sub2" href="#howto" id="howtoBtn" aria-controls="howto" aria-expanded="false">하는 법</a>` : '';
  const body = `<div class="head"><h1>${esc(g.title)}</h1><span class="tag${tagCls}">${esc(g.status)}</span></div>
<p class="meta">${esc(summaryText(g))}</p>
<div class="btns"><a class="btn" href="play.html">게임하기</a>${howTo}</div>
${g.howTo ? `<section class="howto prose" id="howto" hidden><h2>하는 법</h2>
${paragraphs(g.howTo)}</section>
<noscript><style>#howto[hidden]{display:block}</style></noscript>
<script>(function(){var b=document.getElementById('howtoBtn'),s=document.getElementById('howto');
function set(o){s.hidden=!o;b.setAttribute('aria-expanded',o)}
if(location.hash==='#howto')set(true);
b.addEventListener('click',function(e){e.preventDefault();set(s.hidden);if(!s.hidden)s.scrollIntoView({behavior:'smooth',block:'nearest'})});})();</script>` : ''}
${g.ranking ? rankingHtml(g, base) : ''}
${adSlot()}
${g.story ? `<h2>만든 이야기</h2>
<div class="prose">${paragraphs(g.story)}</div>` : ''}
<a class="back" href="${base}">← 목록으로 돌아가기</a>`;
  write(`games/${g.slug}/index.html`, page({
    title: `${g.title} | ${config.siteName}`,
    desc: summaryText(g),
    canonical: `${siteUrl}games/${g.slug}/`,
    base,
    body,
  }));
  buildPlay(g);
  // 게임 파일은 그대로 복사. 랭킹이 켜진 게임만 </head> 앞에 랭킹 스크립트 한 줄을 넣는다
  let html = fs.readFileSync(path.join(ROOT, 'games', g.slug, 'game.html'), 'utf8');
  if (g.ranking) {
    if (!html.includes('</head>')) throw new Error(`games/${g.slug}/game.html 에 </head> 가 없어 랭킹 스크립트를 넣을 수 없음`);
    html = html.replace('</head>', `<script src="${base}ranking.js"></script>\n</head>`);
  }
  write(`games/${g.slug}/game.html`, html);
  // game.html 옆의 다른 파일 (폰트, 라이선스 등) 도 그대로 복사
  const dir = path.join(ROOT, 'games', g.slug);
  for (const f of fs.readdirSync(dir)) {
    if (f === 'game.html' || f.endsWith('.md') || !fs.statSync(path.join(dir, f)).isFile()) continue;
    fs.copyFileSync(path.join(dir, f), path.join(OUT, 'games', g.slug, f));
  }
}

// 게임하기 페이지: 게임만 화면에 꽉 차게, 구석에 [나가기] 하나
// 게임은 game.html 을 화면 전체 크기 iframe 으로 열어서, 따로 열었을 때와 크기가 같다
const PLAY_CSS = `:root{color-scheme:light dark;--bg:light-dark(#fdf3e1,#2a2018)}
html,body{margin:0;padding:0;height:100%;overflow:hidden;overscroll-behavior:none;touch-action:none;background:var(--bg);-webkit-text-size-adjust:100%;text-size-adjust:100%}
iframe{position:fixed;top:0;left:0;display:block;width:100%;height:100%;height:100dvh;border:0;background:var(--bg)}
.exit{position:fixed;z-index:10;left:calc(8px + env(safe-area-inset-left));bottom:calc(8px + env(safe-area-inset-bottom));font:15px/1 "Jua",system-ui,sans-serif;color:#fff;background:rgba(74,52,38,.6);text-decoration:none;padding:8px 12px;border-radius:999px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.exit:focus-visible{outline:3px solid #e2553f;outline-offset:2px}`;

function buildPlay(g) {
  write(`games/${g.slug}/play.html`, `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<script>${NO_ZOOM}</script>
<title>${esc(g.title)} 게임하기 | ${esc(config.siteName)}</title>
<link rel="canonical" href="${esc(siteUrl)}games/${g.slug}/">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Jua&display=swap" rel="stylesheet">
<style>
${PLAY_CSS}
</style>
</head>
<body>
<iframe src="game.html" title="${esc(g.title)} 게임" allow="fullscreen" loading="eager"></iframe>
<a class="exit" href="./">나가기</a>
<script>document.querySelector('iframe').addEventListener('load',function(){try{this.contentWindow.focus()}catch(e){}});</script>
${analytics()}
</body>
</html>
`);
}

// 예전 주소 (루트의 <slug>.html) 에서 새 게임 페이지로 이동
function buildRedirect(g) {
  const to = `games/${g.slug}/`;
  write(`${g.slug}.html`, `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${esc(g.title)}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${siteUrl}${to}">
<meta http-equiv="refresh" content="0; url=${to}">
<script>location.replace(${JSON.stringify(to)} + location.search + location.hash);</script>
</head>
<body><p><a href="${to}">${esc(g.title)} 으로 이동</a></p></body>
</html>
`);
}

// ---------- 소개, 개인정보처리방침 ----------
// 원본 안의 <!-- if:ads --> ... <!-- endif --> 와 <!-- if:analytics --> ... <!-- endif --> 는 설정이 켜졌을 때만 남긴다
function applyIf(html) {
  const flags = { ads: adsOn, analytics: !!config.analyticsToken };
  return html.replace(/<!-- if:(\w+) -->([\s\S]*?)<!-- endif -->/g, (_, k, inner) => (flags[k] ? inner : ''));
}

function buildPage(name, title) {
  // <!-- mail --> 자리에 문의 메일 링크를 넣는다
  const src = applyIf(fs.readFileSync(path.join(ROOT, 'pages', name), 'utf8')).replace(/<!-- mail -->/g, () => mailLink()).trim();
  write(name, page({
    title: `${title} | ${config.siteName}`,
    desc: `${config.siteName} ${title}`,
    canonical: `${siteUrl}${name}`,
    base: '',
    body: `${topLink('./')}\n<div class="prose">\n${src}\n</div>`,
  }));
}

// ---------- sitemap, robots ----------
function buildSeo() {
  const today = new Date().toISOString().slice(0, 10);
  const latest = games.map(g => g.date).sort().pop() || today;
  const urls = [
    { loc: siteUrl, lastmod: latest },
    ...games.map(g => ({ loc: `${siteUrl}games/${g.slug}/`, lastmod: g.date })),
    { loc: `${siteUrl}about.html` },
    { loc: `${siteUrl}privacy.html` },
  ];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`);
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`);
}

// ---------- 실행 ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
write('.nojekyll', ''); // GitHub Pages 가 파일을 그대로 쓰게
fs.copyFileSync(path.join(ROOT, 'assets', 'ranking.js'), path.join(OUT, 'ranking.js'));
buildIndex();
games.forEach(buildGame);
games.forEach(buildRedirect);
buildPage('about.html', '소개');
buildPage('privacy.html', '개인정보처리방침');
buildSeo();
console.log(`완료: 게임 ${games.length}개 -> docs/`);

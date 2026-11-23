// 모든 게임이 같이 쓰는 랭킹 스크립트
// 게임 끝 화면: Ranking.show({ game, score, playTime, title })
// 게임 소개 페이지: Ranking.board(요소, game, 제목)
// 모드가 있는 게임은 game 을 '<slug>:<모드>' 로 쓴다 (games.json 의 rankingModes)
(function () {
  'use strict';
  var API = '/api/ranking';
  var NAME_KEY = 'rankingName';
  var FAIL = '지금은 랭킹을 불러올 수 없어요';

  var CSS = [
    '.rk-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(40,28,20,.6);display:flex;align-items:center;justify-content:center;padding:16px;touch-action:auto;user-select:text;-webkit-user-select:text}',
    '.rk-box{--rk-bg:light-dark(#fdf3e1,#2a2018);--rk-ink:light-dark(#4a3426,#f6e7d0);--rk-card:light-dark(#fffaf0,#3a2c20);--rk-line:light-dark(#e4cfae,#5a4430);--rk-sub:light-dark(#7a6250,#cbb79f);background:var(--rk-bg);color:var(--rk-ink);border-radius:20px;padding:20px 18px;width:min(100%,360px);max-height:calc(100% - 16px);overflow:auto;box-shadow:0 4px 0 var(--rk-line);font:15px/1.5 system-ui,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;text-align:center}',
    '.rk-box h2,.rk-board h2{font-family:"Jua",sans-serif;font-size:24px;line-height:1.2;margin:0 0 6px}',
    '.rk-score{font-family:"Jua",sans-serif;font-size:32px;margin:0 0 12px}',
    '.rk-form{display:flex;gap:8px;margin-bottom:8px}',
    '.rk-form input{flex:1;min-width:0;font:inherit;font-size:17px;padding:10px 12px;border:2px solid var(--rk-line);border-radius:12px;background:var(--rk-card);color:var(--rk-ink)}',
    '.rk-form input:focus-visible{outline:3px solid #7cc36a;outline-offset:1px}',
    '.rk-btn{font-family:"Jua",sans-serif;font-size:18px;background:#e2553f;color:#fff;border:0;border-radius:12px;padding:10px 18px;min-height:44px;box-shadow:0 3px 0 #a83727;cursor:pointer}',
    '.rk-btn:disabled{opacity:.6;cursor:default}',
    '.rk-btn.rk-gray{background:#8b6b4a;box-shadow:0 3px 0 #5e4630}',
    '.rk-btn:focus-visible{outline:3px solid #7cc36a;outline-offset:3px}',
    '.rk-msg{min-height:1.5em;color:var(--rk-sub);margin:4px 0 8px}',
    '.rk-msg.rk-err{color:#e2553f}',
    '.rk-table{width:100%;border-collapse:collapse;background:var(--rk-card);border-radius:14px;overflow:hidden;box-shadow:0 3px 0 var(--rk-line);font-size:15px;margin-bottom:14px}',
    '.rk-table th,.rk-table td{padding:6px 8px;text-align:left;border-bottom:1px solid var(--rk-line)}',
    '.rk-table th{font-family:"Jua",sans-serif;font-weight:normal;color:var(--rk-sub)}',
    '.rk-table tr:last-child td{border-bottom:0}',
    '.rk-table .rk-n{width:2.2em;text-align:center;font-family:"Jua",sans-serif}',
    '.rk-table .rk-s{text-align:right;font-family:"Jua",sans-serif;white-space:nowrap}',
    '.rk-table .rk-t{text-align:right;color:var(--rk-sub);white-space:nowrap;font-size:13px}',
    '.rk-table .rk-me td{background:light-dark(#ffe7c2,#5a4027)}',
    '.rk-name{word-break:break-all}',
    '.rk-empty{color:var(--rk-sub);padding:10px 0}',
    '.rk-board{--rk-ink:inherit;--rk-card:var(--card,#fffaf0);--rk-line:var(--line,#e4cfae);--rk-sub:var(--sub,#7a6250)}',
  ].join('\n');

  function injectCss() {
    if (document.getElementById('rk-css')) return;
    var s = document.createElement('style');
    s.id = 'rk-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtTime(sec) {
    if (sec == null) return '';
    var m = Math.floor(sec / 60), s = sec % 60;
    return m ? m + '분 ' + s + '초' : s + '초';
  }

  function fmtDate(d) {
    // "2026-11-19 03:04:05" (UTC) -> "11.19"
    var t = new Date(String(d).replace(' ', 'T') + 'Z');
    return isNaN(t) ? '' : (t.getMonth() + 1) + '.' + t.getDate();
  }

  // 서버 호출 (6초 넘으면 실패로 봄)
  function call(method, url, body) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    return fetch(url, {
      method: method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl ? ctl.signal : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        clearTimeout(timer);
        if (r.ok && d.ok) return d;
        var e = new Error(d.error || FAIL);
        e.soft = !!d.error && r.status < 500; // 서버가 알려준 이유 (닉네임 등)
        throw e;
      });
    }, function (e) { clearTimeout(timer); throw e; });
  }

  function load(game) {
    return call('GET', API + '?game=' + encodeURIComponent(game));
  }

  function tableHtml(top, me) {
    if (!top || !top.length) return '<p class="rk-empty">아직 기록이 없어요. 첫 번째 주인공이 되어보세요!</p>';
    var rows = top.map(function (r, i) {
      var mine = me && r.name === me;
      return '<tr' + (mine ? ' class="rk-me"' : '') + '><td class="rk-n">' + (i + 1) + '</td><td class="rk-name">' + esc(r.name) +
        '</td><td class="rk-s">' + esc(r.score) + '점</td><td class="rk-t">' + esc(fmtTime(r.playTime)) + ' ' + esc(fmtDate(r.date)) + '</td></tr>';
    }).join('');
    return '<table class="rk-table"><thead><tr><th class="rk-n">#</th><th>닉네임</th><th class="rk-s">점수</th><th class="rk-t">시간, 날짜</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function getName() { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } }
  function setName(n) { try { localStorage.setItem(NAME_KEY, n); } catch (e) {} }

  // 게임 끝 화면에서 부르는 창
  function show(opt) {
    opt = opt || {};
    var game = opt.game, score = Math.floor(Number(opt.score) || 0);
    var playTime = opt.playTime == null ? null : Math.floor(Number(opt.playTime));
    if (!game || !window.fetch) return;
    injectCss();
    close();

    var ov = document.createElement('div');
    ov.className = 'rk-ov';
    ov.id = 'rk-ov';
    ov.innerHTML = '<div class="rk-box" role="dialog" aria-modal="true" aria-labelledby="rk-title">' +
      '<h2 id="rk-title">' + esc(opt.title || '랭킹 등록') + '</h2><p class="rk-score">' + esc(score) + '점</p>' +
      '<form class="rk-form"><input name="n" maxlength="20" autocomplete="nickname" placeholder="닉네임 (1~10자)" aria-label="닉네임"><button class="rk-btn" type="submit">등록</button></form>' +
      '<p class="rk-msg" aria-live="polite"></p><div class="rk-list"></div>' +
      '<button class="rk-btn rk-gray rk-close" type="button">닫기</button></div>';
    document.body.appendChild(ov);

    var form = ov.querySelector('form'), input = ov.querySelector('input'), btn = form.querySelector('button');
    var msg = ov.querySelector('.rk-msg'), list = ov.querySelector('.rk-list');
    ov.querySelector('.rk-close').addEventListener('click', close);
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    input.value = getName();

    var say = function (t, err) { msg.textContent = t; msg.className = 'rk-msg' + (err ? ' rk-err' : ''); };
    var down = function () { form.style.display = 'none'; list.innerHTML = ''; say(FAIL); };

    // 먼저 TOP 10 을 불러와서 서버가 살아 있는지 확인
    say('불러오는 중...');
    load(game).then(function (d) {
      say('');
      list.innerHTML = tableHtml(d.top);
      try { input.focus({ preventScroll: true }); } catch (e) {}
    }, down);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = input.value.replace(/\s+/g, ' ').trim();
      if (!name || Array.from(name).length > 10) { say('닉네임은 1~10자로 써주세요', true); return; }
      btn.disabled = true;
      say('등록 중...');
      call('POST', API, { game: game, name: name, score: score, playTime: playTime }).then(function (d) {
        setName(d.name);
        form.style.display = 'none';
        say(d.improved ? d.name + '님은 ' + d.rank + '위예요!' : d.name + '님의 최고 기록 ' + d.best + '점은 ' + d.rank + '위예요');
        list.innerHTML = tableHtml(d.top, d.name);
        // 게임 소개 페이지의 TOP 10 도 새로 고치기
        try { if (window.parent !== window) window.parent.postMessage({ type: 'ranking-updated', game: game }, location.origin); } catch (e2) {}
      }, function (err) {
        btn.disabled = false;
        if (err && err.soft) say(err.message, true); else down();
      });
    });
  }

  function close() {
    var ov = document.getElementById('rk-ov');
    if (ov) ov.remove();
  }

  // 게임 소개 페이지의 TOP 10 칸
  function board(el, game, title) {
    var head = '<h2>' + esc(title || '랭킹 TOP 10') + '</h2>';
    if (!el || !window.fetch) return;
    injectCss();
    el.classList.add('rk-board');
    var draw = function () {
      load(game).then(function (d) {
        el.innerHTML = head + tableHtml(d.top, getName());
      }, function () {
        el.innerHTML = head + '<p class="rk-empty">' + FAIL + '</p>';
      });
    };
    draw();
    window.addEventListener('message', function (e) {
      if (e.origin === location.origin && e.data && e.data.type === 'ranking-updated' && e.data.game === game) draw();
    });
  }

  window.Ranking = { show: show, board: board, close: close };
})();

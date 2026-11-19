// 랭킹 API (Cloudflare Pages Functions, D1 바인딩 이름 DB)
// GET  /api/ranking?game=<slug>                      : TOP 10
// POST /api/ranking { game, name, score, playTime }  : 등록 후 내 순위와 TOP 10
import games from '../../games.json';
import badwords from '../../badwords.json';

const TOP_N = 10;
const RATE_WINDOW = 60;  // 초
const RATE_MAX = 5;      // 1분에 이만큼까지만

// ranking: true 인 게임만 받는다
const GAMES = new Map(games.filter(g => g.ranking).map(g => [g.slug, g]));

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const fail = (status, error) => json({ ok: false, error }, status);

// 욕설 비교용: 소문자, 공백과 기호 제거
const squash = s => s.toLowerCase().replace(/[\s\p{P}\p{S}_]/gu, '');
const BAD = badwords.map(squash).filter(Boolean);

function cleanName(raw) {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (/[\p{Cc}\p{Cf}<>]/u.test(name)) return { error: '닉네임에 쓸 수 없는 글자가 있어요' };
  const len = [...name].length;
  if (len < 1 || len > 10) return { error: '닉네임은 1~10자로 써주세요' };
  const flat = squash(name);
  if (BAD.some(w => flat.includes(w))) return { error: '다른 닉네임을 써주세요' };
  return { name };
}

async function hashIp(ip, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + '|' + ip));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function top(db, game) {
  const { results } = await db.prepare(
    'SELECT name, score, play_time AS playTime, created_at AS date FROM scores WHERE game = ? ORDER BY score DESC, created_at ASC LIMIT ?'
  ).bind(game, TOP_N).all();
  return results;
}

export async function onRequestGet({ request, env }) {
  const game = new URL(request.url).searchParams.get('game') || '';
  if (!GAMES.has(game)) return fail(404, '랭킹이 없는 게임이에요');
  return json({ ok: true, top: await top(env.DB, game) });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return fail(400, '잘못된 요청이에요'); }

  const game = String(body?.game || '');
  const g = GAMES.get(game);
  if (!g) return fail(404, '랭킹이 없는 게임이에요');

  const n = cleanName(body.name);
  if (n.error) return fail(400, n.error);

  const score = Number(body.score);
  if (!Number.isSafeInteger(score) || score < 0) return fail(400, '점수가 이상해요');
  if (g.maxScore && score > g.maxScore) return fail(400, '점수가 이상해요');

  let playTime = body.playTime == null ? null : Math.floor(Number(body.playTime));
  if (playTime !== null && !(playTime >= 0 && playTime <= 86400)) playTime = null;

  // 같은 IP 에서 너무 자주 올리면 거절
  const db = env.DB;
  const now = Math.floor(Date.now() / 1000);
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const ipHash = await hashIp(ip, env.IP_SALT || 'mini-games');
  const recent = await db.prepare('SELECT COUNT(*) AS c FROM submits WHERE ip_hash = ? AND created_at > ?')
    .bind(ipHash, now - RATE_WINDOW).first('c');
  if (recent >= RATE_MAX) return fail(429, '조금 있다가 다시 올려주세요');

  // 기록 남기고, 같은 닉네임은 더 높은 점수일 때만 바꾼다
  await db.batch([
    db.prepare('INSERT INTO submits (ip_hash, created_at) VALUES (?, ?)').bind(ipHash, now),
    db.prepare('DELETE FROM submits WHERE created_at < ?').bind(now - 3600),
    db.prepare(
      `INSERT INTO scores (game, name, score, play_time) VALUES (?, ?, ?, ?)
       ON CONFLICT (game, name) DO UPDATE SET score = excluded.score, play_time = excluded.play_time, created_at = excluded.created_at
       WHERE excluded.score > scores.score`
    ).bind(game, n.name, score, playTime),
  ]);

  const best = await db.prepare('SELECT score FROM scores WHERE game = ? AND name = ?').bind(game, n.name).first('score');
  const ahead = await db.prepare('SELECT COUNT(*) AS c FROM scores WHERE game = ? AND score > ?').bind(game, best).first('c');
  return json({ ok: true, name: n.name, best, improved: score >= best, rank: ahead + 1, top: await top(db, game) });
}

-- 랭킹 DB 스키마 (Cloudflare D1, 바인딩 이름 DB)
-- 적용: npx wrangler d1 execute mini-games-db --remote --file=schema.sql

-- 점수: 게임마다 닉네임 하나에 최고 점수 하나
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  play_time INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS scores_game_name ON scores (game, name);
CREATE INDEX IF NOT EXISTS scores_game_score ON scores (game, score DESC);

-- 너무 자주 올리는 것 막기용 기록 (IP 는 해시로만 저장)
CREATE TABLE IF NOT EXISTS submits (
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS submits_ip_time ON submits (ip_hash, created_at);

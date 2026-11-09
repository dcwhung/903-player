-- Backend Phase 2a：catalog 內容（document 式）+ publish 記錄 + admin session
-- entries：每個節目 / 劇集一行；definition 同 library 嘅 show.json / drama.json 一模一樣（JSON text）
--   images：JSON「檔名 → R2 圖檔名 <sha256 前 16 hex>.<ext>」（catalog/v1/img/ 底下）
CREATE TABLE entries (
    kind TEXT NOT NULL CHECK (kind IN ('shows', 'dramas')),
    id TEXT NOT NULL,
    definition TEXT NOT NULL,
    images TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (kind, id)
);

-- assets：R2 已經有嘅圖（content hash，同一張圖只上載一次）
CREATE TABLE assets (
    hash TEXT PRIMARY KEY,
    content_type TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

-- publishes：每次寫 R2 catalog.json 都記一行（包括還原）；最大 id = 而家 publish 緊嗰份
--   hash：document JSON 嘅 sha256 hex（亦係 catalog.json 嘅 ETag）
--   episode_ids：JSON array，下次 publish 嘅 ID 守衛用
--   rollback_of：還原自邊個 publish（普通 publish 係 NULL）
CREATE TABLE publishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    hash TEXT NOT NULL,
    document TEXT NOT NULL,
    episode_ids TEXT NOT NULL,
    show_count INTEGER NOT NULL,
    drama_count INTEGER NOT NULL,
    episode_count INTEGER NOT NULL,
    rollback_of INTEGER REFERENCES publishes (id)
);

-- sessions：只存 token 嘅 SHA-256 hex（D1 漏咗都用唔到）；expires_at 係 epoch ms
CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE INDEX sessions_expires_at ON sessions (expires_at);

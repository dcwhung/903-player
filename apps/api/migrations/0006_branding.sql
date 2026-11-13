-- App 外觀（.proj-docs/plans/2026-11-13_plan_branding.md）：App 圖示 + 名稱與簡介（同 0005 banner 一樣：
--   PUT 存 D1 草稿，POST /api/publish 先寫入 catalog.json 嘅 branding；冇行 =「還原」，player 用 repo 內建）
-- branding_icon：只會有一行（id = 1）；五個 R2 圖檔名 <sha256 前 16 hex>.png + maskable 底色 #rrggbb
CREATE TABLE branding_icon (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    favicon TEXT NOT NULL,
    apple_touch TEXT NOT NULL,
    icon_192 TEXT NOT NULL,
    icon_512 TEXT NOT NULL,
    maskable TEXT NOT NULL,
    maskable_background TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- branding_text：只會有一行（id = 1）；short_name NULL = 用 name（manifest short_name）
CREATE TABLE branding_text (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    short_name TEXT,
    description TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- publishes.deploy：publish 改咗 branding 先觸發重新部署 player（GitHub repository_dispatch + Vercel hook）
--   none = 唔使部署；triggered = 已觸發；skipped = 未設 secret；failed = 觸發失敗（publish 照成功）
--   deploy_requested_at：觸發時間（查 GitHub Actions run 用；none 係 NULL）
ALTER TABLE publishes ADD COLUMN deploy TEXT NOT NULL DEFAULT 'none'
    CHECK (deploy IN ('none', 'triggered', 'skipped', 'failed'));
ALTER TABLE publishes ADD COLUMN deploy_requested_at TEXT;

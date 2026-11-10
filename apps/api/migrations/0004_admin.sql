-- Phase 3a（admin）：
-- entries.draft：R2 掃描自動建立、未齊必須資料（圖、ID、排期）嘅廣播劇 = 1
--   draft = 1：PUT 用寬鬆驗證（容許未上載圖），一次 PUT 通過完整驗證就自動清返 0；publish 唔包
ALTER TABLE entries ADD COLUMN draft INTEGER NOT NULL DEFAULT 0 CHECK (draft IN (0, 1));

-- scan_findings：掃描發現（新劇 / 新短篇 / 新集數 / 資料夾唔見）；admin 待辦矩陣由佢 + entry 現況計
--   detail：JSON（短篇名、集數範圍、資料夾名等）
--   resolved_publish_id：發佈成功就填（新劇 / 新短篇 / 新集數）；資料夾唔見喺配對資料夾時刪走
CREATE TABLE scan_findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL CHECK (kind IN ('newDrama', 'newArc', 'newEpisodes', 'missingFolder')),
    drama_id TEXT NOT NULL,
    arc_id TEXT,
    detail TEXT NOT NULL,
    created_at TEXT NOT NULL,
    resolved_publish_id INTEGER REFERENCES publishes (id)
);

CREATE INDEX scan_findings_open ON scan_findings (resolved_publish_id, drama_id);

-- publishes.error：publish 失敗（status = 'failed'）嘅原因，上下架記錄顯示
ALTER TABLE publishes ADD COLUMN error TEXT;
